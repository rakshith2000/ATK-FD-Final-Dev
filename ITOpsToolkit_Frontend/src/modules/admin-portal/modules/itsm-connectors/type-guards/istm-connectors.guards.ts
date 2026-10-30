import type { ITSMConnectorConfig, ITSMConnectorsListResponse } from '../types/itsm-connectors';

export function isITSMConnectorsListResponse(value: unknown): value is ITSMConnectorsListResponse {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                typeof (item as Record<string, unknown>).itsm_tag === 'string' &&
                typeof (item as Record<string, unknown>).itsm_type === 'string' &&
                typeof (item as Record<string, unknown>).updated_by === 'string',
        )
    );
}

export function isITSMConnectorConfig(value: unknown): value is ITSMConnectorConfig {
    if (value == null || typeof value !== 'object') return false;

    const v = value as Record<string, unknown>;

    // required string fields
    if (typeof v.itsm_tag !== 'string' || v.itsm_tag.length === 0) return false;
    if (typeof v.itsm_type !== 'string' || v.itsm_type.length === 0) return false;
    if (typeof v.itsm_auth_type !== 'string' || v.itsm_auth_type.length === 0) return false;
    if (typeof v.itsm_url !== 'string' || v.itsm_url.length === 0) return false;

    // optional string fields
    if (v.itsm_user !== undefined && typeof v.itsm_user !== 'string') return false;
    if (v.itsm_password !== undefined && typeof v.itsm_password !== 'string') return false;
    if (v.bearer_token !== undefined && typeof v.bearer_token !== 'string') return false;

    // optional record field
    if (v.itsm_additional_config !== undefined || v.itsm_additional_config !== null) {
        if (typeof v.itsm_additional_config !== 'object' || Array.isArray(v.itsm_additional_config)) return false;
    }

    return true;
}
