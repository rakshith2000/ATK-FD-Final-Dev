import type { SnowTicket, SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import { fetchProblemsAssignedByUserSysId } from './fetch-problem-assigned-by-user-sys-id';
import { fetchProblemsByAssignedGroupQuery } from './fetch-problem-by-assigned-group-query';
import { fetchProblemsUnassigned } from './fetch-problem-unassigned';

export interface FetchIncidentsParams {
    assignmentType: SnowTicketAssignmentFilterType;
    searchValue?: string;
    limit?: number;
    offset?: number;
    groupQuery?: string;
}
export const fetchProblemsByAssignmentType = async ({ assignmentType, searchValue, limit = 20, offset = 0, groupQuery }: FetchIncidentsParams): Promise<Array<SnowTicket>> => {
    const commonParams = { searchValue, limit, offset };

    switch (assignmentType) {
        case 'assigned-to-user':
            return fetchProblemsAssignedByUserSysId(commonParams);

        case 'assignemnt-group':
            if (!groupQuery) {
                throw new Error("Missing required 'groupQuery' parameter for 'assignemnt-group' filter type.");
            }
            return fetchProblemsByAssignedGroupQuery({ ...commonParams, groupQuery });

        case 'unassigned':
            return fetchProblemsUnassigned(commonParams);

        default: {
            throw new Error(`Unhandled assignment assignment type: ${assignmentType}`);
        }
    }
};
