import type {
    Meeting,
    ListMeetingsByParticipantAndGroupResponse,
    TranscriptChunk,
    MeetingKnowledgeArticle,
    GetMeetingDetailsResponse,
    UpdateGroupsByMeetingIdResponse,
    ArchivedArticle,
    GetArchivedArticlesResponse,
    MeetingChatMessage,
    MeetingChatResponse,
    OnboardMeetingResponse,
    GetPublicFlowAuthDetailsResponse,
    StartOrRefreshMeetingResponse,
    MeetingTranscriptItem,
    GetMeetingTranscriptResponse,
    ConvertToHtmlResponse,
} from '../types/meeting-ai';

// ============================================================================
// Generic helpers
// ============================================================================

function isStringOrNull(v: unknown): v is string | null {
    return v === null || typeof v === 'string';
}

function isStringArrayOrNull(v: unknown): v is string[] | null {
    return v === null || (Array.isArray(v) && v.every((item) => typeof item === 'string'));
}

function isNumberOrNull(v: unknown): v is number | null {
    return v === null || typeof v === 'number';
}

// ============================================================================
// GET /list_meetings_by_participant_and_group/
// ============================================================================

function isMeeting(value: unknown): value is Meeting {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === 'string' &&
        typeof v.title === 'string' &&
        typeof v.groups === 'string' &&
        typeof v.web_meeting_url === 'string' &&
        typeof v.created_at === 'string' &&
        typeof v.updated_at === 'string' &&
        isStringOrNull(v.started_at) &&
        isStringOrNull(v.ended_at) &&
        isStringArrayOrNull(v.participants) &&
        typeof v.occurrences === 'number' &&
        typeof v.auth_required === 'boolean' &&
        isStringOrNull(v.subject) &&
        isStringOrNull(v.meeting_link_id)
    );
}

export function isListMeetingsByParticipantAndGroupResponse(value: unknown): value is ListMeetingsByParticipantAndGroupResponse {
    if (!Array.isArray(value)) return false;
    return value.every(isMeeting);
}

// ============================================================================
// GET /meetings/{id}/details
// ============================================================================

function isTranscriptChunk(value: unknown): value is TranscriptChunk {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    return Object.values(value).every((v) => typeof v === 'string');
}

// Summary and knowledge-article `content` are LLM-generated markdown strings.
function isMeetingKnowledgeArticle(value: unknown): value is MeetingKnowledgeArticle {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.title === 'string' && typeof v.content === 'string';
}

function isMeetingDetails(value: unknown): value is GetMeetingDetailsResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    if (!isMeeting(v.meeting)) return false;
    if (!Array.isArray(v.transcripts) || !v.transcripts.every(isTranscriptChunk)) return false;
    if (typeof v.summary !== 'string') return false;
    if (!Array.isArray(v.knowledge_articles) || !v.knowledge_articles.every(isMeetingKnowledgeArticle)) return false;
    return true;
}

export function isGetMeetingDetailsResponse(value: unknown): value is GetMeetingDetailsResponse {
    return isMeetingDetails(value);
}

// ============================================================================
// POST /meetings/{id}/update_groups_by_meeting_id/
// ============================================================================

export function isUpdateGroupsByMeetingIdResponse(value: unknown): value is UpdateGroupsByMeetingIdResponse {
    return isMeeting(value);
}

// ============================================================================
// GET /meetings/{id}/archived_articles
// ============================================================================

function isArchivedArticle(value: unknown): value is ArchivedArticle {
    if (!isMeetingKnowledgeArticle(value)) return false;
    const v = value as unknown as Record<string, unknown>;
    return typeof v.id === 'string' && typeof v.meeting_id === 'string' && typeof v.created_at === 'string' && typeof v.archived === 'boolean';
}

export function isGetArchivedArticlesResponse(value: unknown): value is GetArchivedArticlesResponse {
    if (!Array.isArray(value)) return false;
    return value.every(isArchivedArticle);
}

// ============================================================================
// POST /meetings/ask
// ============================================================================

function isMeetingChatMessage(value: unknown): value is MeetingChatMessage {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (v.role === 'user' || v.role === 'assistant') && typeof v.content === 'string';
}

function isMeetingChatResponseData(value: unknown): value is MeetingChatResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.response === 'string' && Array.isArray(v.conversation_history) && v.conversation_history.every(isMeetingChatMessage);
}

export function isMeetingChatResponse(value: unknown): value is MeetingChatResponse {
    return isMeetingChatResponseData(value);
}

// ============================================================================
// POST /onboard_meeting_details
// ============================================================================

export function isOnboardMeetingResponse(value: unknown): value is OnboardMeetingResponse {
    return isMeeting(value);
}

// ============================================================================
// GET /meetings/{id}/get_public_flow_auth_details/{retrievalType}
// ============================================================================

function isPublicFlowAuthDetails(value: unknown): value is GetPublicFlowAuthDetailsResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === 'string' &&
        typeof v.meeting_id === 'string' &&
        typeof v.auth_code === 'string' &&
        typeof v.auth_url === 'string' &&
        typeof v.client_id === 'string' &&
        isStringOrNull(v.access_token) &&
        isStringOrNull(v.refresh_token) &&
        isNumberOrNull(v.expires_in) &&
        typeof v.created_at === 'string'
    );
}

export function isGetPublicFlowAuthDetailsResponse(value: unknown): value is GetPublicFlowAuthDetailsResponse {
    return isPublicFlowAuthDetails(value);
}

// ============================================================================
// GET /meetings/{id}/start_or_refresh/{retrievalType}
// ============================================================================

export function isStartOrRefreshMeetingResponse(value: unknown): value is StartOrRefreshMeetingResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.access_token === 'string' && typeof v.refresh_token === 'string' && typeof v.expires_in === 'number';
}

// ============================================================================
// GET /meetings/{id}/transcript/{retrievalType}
// ============================================================================

function isMeetingTranscriptItem(value: unknown): value is MeetingTranscriptItem {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.transcript_timestamp === 'string' &&
        typeof v.meeting_id === 'string' &&
        typeof v.timestamp === 'string' &&
        typeof v.content === 'string' &&
        typeof v.id === 'string'
    );
}

export function isGetMeetingTranscriptResponse(value: unknown): value is GetMeetingTranscriptResponse {
    if (!Array.isArray(value)) return false;
    return value.every(isMeetingTranscriptItem);
}

export function isConvertToHtmlResponse(value: unknown): value is ConvertToHtmlResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;

    if (typeof v.title !== 'string') return false;
    if (typeof v.converted_article !== 'string') return false;

    return true;
}
