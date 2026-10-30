import type { ChangeDetails, DraftChangeResponse, PushChangesResponse } from '../types/change-ai';

// ============================================================================
// POST /draft_change (DraftChangeResponse)
// ============================================================================

function isChangeDetails(value: unknown): value is ChangeDetails {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.short_description === 'string' &&
        typeof v.description === 'string' &&
        typeof v.implementation_plan === 'string' &&
        // backout_plan is optional - the draft_change API does not always return it
        (v.backout_plan === undefined || typeof v.backout_plan === 'string') &&
        typeof v.test_plan === 'string' &&
        typeof v.chg_model === 'string'
    );
}

export function isDraftChangeResponse(value: unknown): value is DraftChangeResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return isChangeDetails(v.change_details) && typeof v.impact_analysis === 'string';
}

// ============================================================================
// POST /push_changes (PushChangesResponse)
// ============================================================================

export function isPushChangesResponse(value: unknown): value is PushChangesResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.number === 'string' && typeof v.sys_id === 'string';
}
