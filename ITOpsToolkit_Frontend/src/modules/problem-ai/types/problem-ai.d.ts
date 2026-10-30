// Path-param / shared aliases

export type ProblemTicketId = string;

//  list-problem-tickets request body.
export type ProblemTicketStatusFilter = 'all' | string;

//  Backend mixes casings (e.g. `recommended`, `Approved`, `proactive_rejected`)

export type ProblemTicketApprovalStatus = 'recommended' | 'Approved' | 'proactive_rejected';

// Shared entities

/** Incident summary attached to a problem ticket  */
export interface AssociatedIncident {
    state: string;
    impact: string;
    number: string;
    urgency: string;
    opened_by: string;
    assigned_to: string;
    sys_created_on: string;
    assignment_group: string;
    short_description: string;
}

/**
 * ServiceNow reference shape for assignment grp and assigned to field
 */
export interface SnowReference {
    link: string;
    value: string;
}

/** Either an empty string  or a populated SNOW reference object. */
export type SnowReferenceOrEmpty = '' | SnowReference;

/** State choice for a problem workflow state dropdown. */
export interface ProblemStateChoice {
    sys_id: string;
    label: string;
    value: string;
}

// Problem ticket (list item)

export interface ProblemTicket {
    id: ProblemTicketId;
    description: string;
    short_description: string;
    approval_status: ProblemTicketApprovalStatus;
    rejection_reason: string | null;
    problem_ticket_link: string | null;
    problem_ticket_number: string | null;
    urgency: string | null;
    state: string | null;
    impact: string | null;
    priority: string | null;
    assigned_to: string | null;
    assignment_group: string | null;
    approver: string | null;
    cmdb_ci?: string | null;
    associated_incidents: AssociatedIncident[];
}

// Request: POST /problem_ticket_details/

export interface ListProblemTicketsRequest {
    status: ProblemTicketStatusFilter;
}

export type ListProblemTicketsResponse = ProblemTicket[];

// Request/Response: GET /list_all_assignment_groups/

export type ListAssignmentGroupsResponse = string[];

// Request/Response: GET /list_incident_state_choice/

export type ListIncidentStateChoicesResponse = ProblemStateChoice[];

// Request/Response: POST /push_problem_ticket_to_itsm/

export interface PushProblemTicketToItsmRequest {
    short_description: string;
    description: string;
    impact: string;
    urgency: string;
    assignment_group: string;
    assigned_to: string;
    cmdb_ci: string;
    related_incidents: AssociatedIncident[];
}

export interface PushProblemTicketToItsmResponse {
    number: string;
    sys_id: string;
    impact: string;
    urgency: string;
    priority: string;
    state: string;
    target_link: string;
    assigned_to: SnowReferenceOrEmpty;
    assignment_group: SnowReferenceOrEmpty;
}

// Request/Response: POST /update_problem_ticket_details/

export interface UpdateProblemTicketDetailsDict {
    approval_status?: ProblemTicketApprovalStatus;
    approver?: string;
    rejection_reason?: string;
    problem_ticket_number?: string;
    problem_ticket_link?: string;
    short_description?: string;
    description?: string;
    impact?: string;
    urgency?: string;
    state?: string;
    assigned_to?: string;
    assignment_group?: string;
    associated_incidents?: AssociatedIncident[];
}

export interface UpdateProblemTicketDetailsRequest {
    id: ProblemTicketId;
    update_dict: UpdateProblemTicketDetailsDict;
}

export type UpdateProblemTicketDetailsResponse = string;

// Request/Response: POST /list_group_members/

export interface ListGroupMembersRequest {
    assignment_group: string;
}

export type ListGroupMembersResponse = string[];

// Request/Response: POST /update_problem_ticket_in_itsm/

export interface UpdateProblemTicketInItsmRequest {
    id: ProblemTicketId;
    number: string;
    description: string;
    short_description: string;
    impact: string;
    urgency: string;
    assignment_group: string;
    assigned_to: string;
    related_incidents: AssociatedIncident[];
    cmdb_ci: string;
    opened_by: string;
    priority: string;
}

export interface UpdateProblemTicketInItsmResponse {
    number: string;
    sys_id: string;
    target_link: string;
}
