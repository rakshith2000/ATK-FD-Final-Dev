import type {
    AssociatedIncident,
    ListAssignmentGroupsResponse,
    ListGroupMembersResponse,
    ListIncidentStateChoicesResponse,
    ListProblemTicketsResponse,
    ProblemStateChoice,
    ProblemTicket,
    PushProblemTicketToItsmResponse,
    SnowReference,
    SnowReferenceOrEmpty,
    UpdateProblemTicketDetailsResponse,
    UpdateProblemTicketInItsmResponse,
} from '../types/problem-ai';

// Generic helpers

function isStringOrNull(v: unknown): v is string | null {
    return v === null || typeof v === 'string';
}

function isStringOrNullOrUndefined(v: unknown): v is string | null | undefined {
    return v === undefined || v === null || typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
    return Array.isArray(v) && v.every((item) => typeof item === 'string');
}

// Shared entities

function isAssociatedIncident(value: unknown): value is AssociatedIncident {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.state === 'string' &&
        typeof v.impact === 'string' &&
        typeof v.number === 'string' &&
        typeof v.urgency === 'string' &&
        typeof v.opened_by === 'string' &&
        typeof v.assigned_to === 'string' &&
        typeof v.sys_created_on === 'string' &&
        typeof v.assignment_group === 'string' &&
        typeof v.short_description === 'string'
    );
}

export function isAssociatedIncidentArray(value: unknown): value is AssociatedIncident[] {
    return Array.isArray(value) && value.every(isAssociatedIncident);
}

function isSnowReference(value: unknown): value is SnowReference {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.link === 'string' && typeof v.value === 'string';
}

function isSnowReferenceOrEmpty(value: unknown): value is SnowReferenceOrEmpty {
    return value === '' || isSnowReference(value);
}

function isProblemStateChoice(value: unknown): value is ProblemStateChoice {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.sys_id === 'string' && typeof v.label === 'string' && typeof v.value === 'string';
}

// POST /problem_ticket_details/

function isProblemTicket(value: unknown): value is ProblemTicket {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === 'string' &&
        typeof v.description === 'string' &&
        typeof v.short_description === 'string' &&
        typeof v.approval_status === 'string' &&
        isStringOrNull(v.rejection_reason) &&
        isStringOrNull(v.problem_ticket_link) &&
        isStringOrNull(v.problem_ticket_number) &&
        isStringOrNull(v.urgency) &&
        isStringOrNull(v.state) &&
        isStringOrNull(v.impact) &&
        isStringOrNull(v.priority) &&
        isStringOrNull(v.assigned_to) &&
        isStringOrNull(v.assignment_group) &&
        isStringOrNull(v.approver) &&
        isStringOrNullOrUndefined(v.cmdb_ci) &&
        isAssociatedIncidentArray(v.associated_incidents)
    );
}

export function isListProblemTicketsResponse(value: unknown): value is ListProblemTicketsResponse {
    return Array.isArray(value) && value.every(isProblemTicket);
}

// GET /list_all_assignment_groups/

export function isListAssignmentGroupsResponse(value: unknown): value is ListAssignmentGroupsResponse {
    return isStringArray(value);
}

// GET /list_incident_state_choice/

export function isListIncidentStateChoicesResponse(value: unknown): value is ListIncidentStateChoicesResponse {
    return Array.isArray(value) && value.every(isProblemStateChoice);
}

// POST /push_problem_ticket_to_itsm/

export function isPushProblemTicketToItsmResponse(value: unknown): value is PushProblemTicketToItsmResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.number === 'string' &&
        typeof v.sys_id === 'string' &&
        typeof v.impact === 'string' &&
        typeof v.urgency === 'string' &&
        typeof v.priority === 'string' &&
        typeof v.state === 'string' &&
        typeof v.target_link === 'string' &&
        isSnowReferenceOrEmpty(v.assigned_to) &&
        isSnowReferenceOrEmpty(v.assignment_group)
    );
}

// POST /update_problem_ticket_details/

export function isUpdateProblemTicketDetailsResponse(value: unknown): value is UpdateProblemTicketDetailsResponse {
    return typeof value === 'string';
}

// POST /list_group_members/

export function isListGroupMembersResponse(value: unknown): value is ListGroupMembersResponse {
    return isStringArray(value);
}

// POST /update_problem_ticket_in_itsm/

export function isUpdateProblemTicketInItsmResponse(value: unknown): value is UpdateProblemTicketInItsmResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.number === 'string' && typeof v.sys_id === 'string' && typeof v.target_link === 'string';
}
