// Path-param aliases

export type MeetingId = string;

export type MeetingRetrievalType = 'reload' | 'refresh';

// Request payloads

export interface FetchMeetingsByGroupsAndUserRequest {
    email: string;
    groups: string;
}

export interface UpdateMeetingGroupsRequest {
    groups: string;
}

export interface MeetingChatRequest {
    meeting_ids: string;
    question: string;
    conversation_history: MeetingChatMessage[];
}

export interface OnboardMeetingRequest {
    title: string;
    web_meeting_url: string;
    groups: string;
}

// ============================================================================
// Meeting (used as list item and as nested 'meeting' in details)
// ============================================================================

export interface Meeting {
    id: string;
    title: string;
    groups: string;
    web_meeting_url: string;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    ended_at: string | null;
    participants: string[] | null;
    occurrences: number;
    auth_required: boolean;
    subject: string | null;
    meeting_link_id: string | null;
}

// ============================================================================
// Response: GET /list_meetings_by_participant_and_group/
// ============================================================================

export type ListMeetingsByParticipantAndGroupResponse = Meeting[];

// ============================================================================
// Response: GET /meetings/{id}/details
// ============================================================================

export type TranscriptChunk = Record<string, string>;

// Summary and knowledge-article content are LLM-generated markdown strings.
export interface MeetingKnowledgeArticle {
    title: string;
    content: string;
}

export interface GetMeetingDetailsResponse {
    meeting: Meeting;
    transcripts: TranscriptChunk[];
    summary: string;
    knowledge_articles: MeetingKnowledgeArticle[];
}

// ============================================================================
// Response: POST /meetings/{id}/update_groups_by_meeting_id/
// ============================================================================

export type UpdateGroupsByMeetingIdResponse = Meeting;
// ============================================================================
// Response: GET /meetings/{id}/archived_articles
// ============================================================================

export interface ArchivedArticle extends MeetingKnowledgeArticle {
    id: string;
    meeting_id: string;
    created_at: string;
    archived: boolean;
}

export type GetArchivedArticlesResponse = ArchivedArticle[];

// ============================================================================
// Response: POST /meetings/ask
// ============================================================================

export type MeetingChatMessageRole = 'user' | 'assistant';

export interface MeetingChatMessage {
    role: MeetingChatMessageRole;
    content: string;
}

export interface MeetingChatResponse {
    response: string;
    conversation_history: MeetingChatMessage[];
}

// ============================================================================
// Response: POST /onboard_meeting_details
// ============================================================================

export type OnboardMeetingResponse = Meeting;
// ============================================================================
// Response: GET /meetings/{id}/get_public_flow_auth_details/{retrievalType}
// ============================================================================

export interface GetPublicFlowAuthDetailsResponse {
    id: string;
    meeting_id: string;
    auth_code: string;
    auth_url: string;
    client_id: string;
    access_token: string | null;
    refresh_token: string | null;
    expires_in: number | null;
    created_at: string;
}

// ============================================================================
// Response: GET /meetings/{id}/start_or_refresh/{retrievalType}
// ============================================================================

export interface StartOrRefreshMeetingResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

// ============================================================================
// Response: GET /meetings/{id}/transcript/{retrievalType}
// ============================================================================

export interface MeetingTranscriptItem {
    transcript_timestamp: string;
    meeting_id: string;
    timestamp: string;
    content: string;
    id: string;
}

export type GetMeetingTranscriptResponse = MeetingTranscriptItem[];

export interface ConvertToHtmlRequest {
    title: string;
    content: string;
}

export interface ConvertToHtmlResponse {
    title: string;
    converted_article: string;
}
