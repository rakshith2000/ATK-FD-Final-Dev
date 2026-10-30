import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { appConfig } from '@/config/app-config';

const TOKEN_KEY = 'fasteai_jwt_token';

const { baseUrl, coreBaseUrl, sopBaseUrl, logsBaseUrl, sopGeneration, coreWebsocket } = appConfig.fasteai.api;
export const FASTEAI_CORE_BASE = `${baseUrl}${coreBaseUrl}`;
export const FASTEAI_SOP_BASE = `${baseUrl}${sopBaseUrl}`;
export const FASTEAI_LOGS_BASE = `${baseUrl}${logsBaseUrl}`;
export const SOP_GENERATION_BASE = `${baseUrl}${sopGeneration}`;
export const FASTEAI_CORE_WS = coreWebsocket;

export const getToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => sessionStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => sessionStorage.removeItem(TOKEN_KEY);

const isTokenUsable = (token: string): boolean => {
    try {
        const [, payload] = token.split('.');
        if (!payload) return false;

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
        const decoded = JSON.parse(atob(padded));
        const exp = Number(decoded?.exp);

        if (!Number.isFinite(exp)) return false;

        const now = Math.floor(Date.now() / 1000);
        return exp - now > 30;
    } catch {
        return false;
    }
};

const login = async (baseUrlToUse: string): Promise<string> => {
    try {
        const response = await axios.post(`${baseUrlToUse}/auth/token`, null, {
            headers: { 'Content-Type': 'application/json' },
        });

        const data = response.data;
        const token = data?.access_token || data?.token || data?.jwt;

        if (!token || typeof token !== 'string') {
            throw new Error('FasteAI auth response missing a valid token');
        }

        setToken(token);
        return token;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`FasteAI auth failed (${error.response.status})`);
        }
        throw error;
    }
};

export const getValidToken = async (baseUrlToUse: string = FASTEAI_SOP_BASE): Promise<string> => {
    const existing = getToken();
    if (existing && isTokenUsable(existing)) return existing;
    clearToken();
    return login(baseUrlToUse);
};

export const fasteaiFetch = async (url: string, baseUrlToUse: string = FASTEAI_SOP_BASE, options: AxiosRequestConfig = {}): Promise<AxiosResponse> => {
    let token = await getValidToken(baseUrlToUse);

    const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
        Authorization: `Bearer ${token}`,
    };

    if (!(options.data instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        return await axios({
            url,
            ...options,
            headers,
        });
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            clearToken();
            token = await getValidToken(baseUrlToUse);
            headers.Authorization = `Bearer ${token}`;

            return await axios({
                url,
                ...options,
                headers,
            });
        }
        throw error;
    }
};

export const createAuthenticatedWebSocket = async (
    wsUrl: string,
    baseUrlToUse: string = FASTEAI_CORE_BASE,
    onOpen?: () => void,
    onMessage?: (event: MessageEvent) => void,
    onClose?: (event: CloseEvent) => void,
    onError?: (event: Event) => void,
): Promise<WebSocket> => {
    const token = await getValidToken(baseUrlToUse);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        ws.send(JSON.stringify({ token }));
        onOpen?.();
    };

    ws.onmessage = (event: MessageEvent) => onMessage?.(event);
    ws.onclose = (event: CloseEvent) => onClose?.(event);
    ws.onerror = (event: Event) => onError?.(event);

    return ws;
};

export const ateFetch = fasteaiFetch;
