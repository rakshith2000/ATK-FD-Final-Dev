import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { isSnowTicketArray } from '@/shared/modules/servicenow/type-guards/ticket.guards';
import type { SnowTicket, SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { getSnowTableEndpointByTicketType } from '@/shared/modules/servicenow/utils/get-snow-table-by-ticket-type';

/**
 * Fetches a page of tickets of the given type assigned to the groups the user
 * belongs to (`groupQuery` is a `^`-joined list of group sys_ids).
 *
 * Parameterized by `ticketType` so it can target any ticket table. Paginated
 * (limit/offset) with optional server-side search, mirroring Incident AI.
 */
export const fetchTicketsByAssignedGroupQuery = async ({
    ticketType,
    groupQuery,
    searchValue,
    limit = 20,
    offset = 0,
}: {
    ticketType: SnowTableName;
    groupQuery: string;
    searchValue?: string;
    limit?: number;
    offset?: number;
}): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        const baseUrl = getSnowTableEndpointByTicketType(ticketType);

        let query = `assignment_groupIN${groupQuery}^request_stateNOT INclosed_complete,closed_skipped,closed_incomplete,closed_cancelled,closed_rejected`;
        if (searchValue && searchValue.trim()) {
            const term = searchValue.trim();
            query = `numberLIKE${term}^ORshort_descriptionLIKE${term}^${query}`;
        }

        const response = await serviceNowApiClient.get(baseUrl, {
            params: {
                sysparm_query: query,
                sysparm_display_value: 'all',
                sysparm_limit: limit,
                sysparm_offset: offset,
            },
        });

        if (response.data?.result && isSnowTicketArray(response.data['result'])) {
            return response.data['result'];
        } else {
            throw new Error('Failed to get the assigned tickets from Service Now by group query!', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
