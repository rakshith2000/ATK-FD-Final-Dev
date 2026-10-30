import type { SnowTicket, SnowTicketAssignmentFilterType, SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { fetchTicketsAssignedByUserSysId } from './fetch-tickets-assigned-by-user-sys-id';
import { fetchTicketsByAssignedGroupQuery } from './fetch-tickets-by-assigned-group-query';
import { fetchTicketsUnassigned } from './fetch-tickets-unassigned';

export interface FetchTicketsParams {
    ticketType: SnowTableName;
    assignmentType: SnowTicketAssignmentFilterType;
    searchValue?: string;
    limit?: number;
    offset?: number;
    groupQuery?: string;
}

/**
 * Dispatches to the correct paginated ticket fetch based on the assignment
 * filter. Mirrors Incident AI's `fetchIncidentsByAssignmentType`, but carries
 * the `ticketType` so it works for any ticket table.
 */
export const fetchTicketsByAssignmentType = async ({
    ticketType,
    assignmentType,
    searchValue,
    limit = 20,
    offset = 0,
    groupQuery,
}: FetchTicketsParams): Promise<Array<SnowTicket>> => {
    const commonParams = { ticketType, searchValue, limit, offset };

    switch (assignmentType) {
        case 'assigned-to-user':
            return fetchTicketsAssignedByUserSysId(commonParams);

        case 'assignemnt-group':
            if (!groupQuery) {
                throw new Error("Missing required 'groupQuery' parameter for 'assignemnt-group' filter type.");
            }
            return fetchTicketsByAssignedGroupQuery({ ...commonParams, groupQuery });

        case 'unassigned':
            return fetchTicketsUnassigned(commonParams);

        default: {
            throw new Error(`Unhandled assignment type: ${assignmentType}`);
        }
    }
};
