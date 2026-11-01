import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * ServiceNow request routing mode.
 *
 * - `proxy`  - requests are rewritten to the ATK backend, which calls ServiceNow
 *              with the configured ITSM connector credentials (service account
 *              basic auth, or a bearer token - the backend decides based on
 *              `itsm_auth_type`). The browser never talks to ServiceNow.
 * - `direct` - requests go straight from the browser to ServiceNow carrying the
 *              caller's own token. Only works when ServiceNow trusts the IdP
 *              that issued it (SSO / OAuth setups).
 */
export type SnowApiMode = 'proxy' | 'direct';

/**
 * Defaults to `proxy` when the key is absent, so a config file that predates
 * this setting keeps working against a service-account deployment.
 */
export const getSnowApiMode = (): SnowApiMode => (appConfig.serviceNow.api.mode === 'direct' ? 'direct' : 'proxy');

/** Backend router prefix. Relative to `appConfig.backend.api.baseUrl`, which already ends in `/api`. */
const PROXY_BASE = '/ticket_management/api/v1';

// ServiceNow URL shapes used across the app. The leading slash is optional -
// some config entries omit it (e.g. `patchTicketBySysId`).
const TABLE_RE = /^\/?api\/now\/table\/([^/?#]+)(?:\/([^/?#]+))?(?:\?([\s\S]*))?$/;
const STATS_RE = /^\/?api\/now\/stats\/([^/?#]+)(?:\?([\s\S]*))?$/;
const ATTACHMENT_DOWNLOAD_RE = /^\/?api\/now\/attachment\/([^/?#]+)\/file(?:\?([\s\S]*))?$/;
const ATTACHMENT_UPLOAD_RE = /^\/?api\/now\/attachment\/file(?:\?([\s\S]*))?$/;

type ProxyParams = Record<string, string>;

/**
 * Folds a URL's inline query string together with axios' `params` object into a
 * single encoded query string.
 *
 * Request interceptors run *before* axios serialises `params`, so both sources
 * have to be merged here or the filters silently vanish.
 *
 * The result is percent-encoded (`URLSearchParams`), which matters: the backend
 * appends this string to the ServiceNow URL verbatim, and FastAPI decodes it
 * exactly once on the way in. Encoding the individual values means a `&` or `#`
 * inside a free-text search term cannot split the query.
 */
const buildQueryString = (inlineQuery: string | undefined, params: unknown): string => {
    const search = new URLSearchParams();

    if (inlineQuery) {
        for (const [key, value] of new URLSearchParams(inlineQuery)) {
            search.append(key, value);
        }
    }

    if (params && typeof params === 'object') {
        for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
            if (value === undefined || value === null) continue;

            if (Array.isArray(value)) {
                for (const item of value) search.append(key, String(item));
            } else {
                search.append(key, String(value));
            }
        }
    }

    return search.toString();
};

/**
 * Rewrites a ServiceNow-shaped request in place so it targets the ATK backend's
 * ServiceNow proxy instead.
 *
 * Returns `true` when the request was rewritten, `false` when the URL did not
 * match any known ServiceNow shape - in which case the caller should leave it
 * pointing at ServiceNow rather than send a request the backend cannot route.
 */
export const rewriteToBackendProxy = (config: InternalAxiosRequestConfig): boolean => {
    const originalUrl = config.url ?? '';
    const method = (config.method ?? 'get').toLowerCase();

    const downloadMatch = ATTACHMENT_DOWNLOAD_RE.exec(originalUrl);
    if (downloadMatch) {
        const [, sysId] = downloadMatch;
        config.url = `${PROXY_BASE}/attachment/`;
        config.params = { sys_id: sysId } satisfies ProxyParams;
        return true;
    }

    const uploadMatch = ATTACHMENT_UPLOAD_RE.exec(originalUrl);
    if (uploadMatch) {
        // The call site already supplies table_name / table_sys_id / file_name as
        // params and the File as the body - the proxy route takes the same three.
        const merged = new URLSearchParams(buildQueryString(uploadMatch[1], config.params));
        config.url = `${PROXY_BASE}/attachment/`;
        config.params = {
            table_name: merged.get('table_name') ?? '',
            table_sys_id: merged.get('table_sys_id') ?? '',
            file_name: merged.get('file_name') ?? '',
        } satisfies ProxyParams;
        return true;
    }

    const statsMatch = STATS_RE.exec(originalUrl);
    if (statsMatch) {
        const [, tableName, inlineQuery] = statsMatch;
        const queryString = buildQueryString(inlineQuery, config.params);
        config.url = `${PROXY_BASE}/stats/`;
        config.params = { table_name: tableName, ...(queryString ? { query_string: queryString } : {}) } satisfies ProxyParams;
        return true;
    }

    const tableMatch = TABLE_RE.exec(originalUrl);
    if (tableMatch) {
        const [, tableName, sysId, inlineQuery] = tableMatch;
        const queryString = buildQueryString(inlineQuery, config.params);

        const proxyParams: ProxyParams = { table_name: tableName };
        if (sysId) proxyParams.sys_id = sysId;
        if (queryString) proxyParams.query_string = queryString;

        switch (method) {
            case 'get':
            case 'post':
            case 'patch':
            case 'put':
                config.url = `${PROXY_BASE}/${method}/`;
                break;
            default:
                logger.warn(`[snow-proxy] Unsupported method '${method}' for ${originalUrl} - leaving request unrewritten.`);
                return false;
        }

        config.params = proxyParams;
        return true;
    }

    logger.warn(`[snow-proxy] Unrecognised ServiceNow URL '${originalUrl}' - no proxy route matches, sending it direct.`);
    return false;
};
