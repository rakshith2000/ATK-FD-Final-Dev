import type { SnowFieldWithValueAndDisplayText } from '.';

export type SnowTableName = 'incident' | 'problem_task' | 'problem' | 'sc_request' | 'sc_req_item' | 'task' | 'change_request' | 'em_alert' | 'kb_knowledge';

export type SnowTicketAssignmentFilterType = 'assigned-to-user' | 'assignemnt-group' | 'unassigned';

export type SnowTicketField = SnowFieldWithValueAndDisplayText;

export type SnowTicket = Record<string, SnowTicketField>;
