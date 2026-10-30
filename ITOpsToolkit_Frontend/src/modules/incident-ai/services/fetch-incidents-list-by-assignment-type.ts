import type { SnowTicket, SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import { fetchIncidentsAssignedByUserSysId } from './fetch-incidents-assigned-by-user-sys-id';
import { fetchIncidentsByAssignedGroupQuery } from './fetch-incidents-by-assigned-group-query';
import { fetchIncidentsUnassigned } from './fetch-incidents-unassigned';

export interface FetchIncidentsParams {
    assignmentType: SnowTicketAssignmentFilterType;
    searchValue?: string;
    limit?: number;
    offset?: number;
    groupQuery?: string;
}
export const fetchIncidentsByAssignmentType = async ({ assignmentType, searchValue, limit = 20, offset = 0, groupQuery }: FetchIncidentsParams): Promise<Array<SnowTicket>> => {
    const commonParams = { searchValue, limit, offset };

    switch (assignmentType) {
        case 'assigned-to-user':
            return fetchIncidentsAssignedByUserSysId(commonParams);

        case 'assignemnt-group':
            if (!groupQuery) {
                throw new Error("Missing required 'groupQuery' parameter for 'assignemnt-group' filter type.");
            }
            return fetchIncidentsByAssignedGroupQuery({ ...commonParams, groupQuery });

        case 'unassigned':
            return fetchIncidentsUnassigned(commonParams);

        default: {
            throw new Error(`Unhandled assignment assignment type: ${assignmentType}`);
        }
    }
};
