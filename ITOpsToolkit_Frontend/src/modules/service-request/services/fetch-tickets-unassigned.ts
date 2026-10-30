import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { isSnowTicketArray } from '@/shared/modules/servicenow/type-guards/ticket.guards';
import type { SnowTicket, SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { getSnowTableEndpointByTicketType } from '@/shared/modules/servicenow/utils/get-snow-table-by-ticket-type';

/**
 * Fetches a page of unassigned tickets of the given type.
 *
 * Parameterized by `ticketType`. Paginated (limit/offset) with optional
 * server-side search, mirroring Incident AI. `assigned_toISEMPTY` selects the
 * unassigned tickets and `stateNOT IN3,4,7` hides the closed sc_request states
 * (3 = Closed Complete, 4 = Closed Incomplete, 7 = Closed Skipped).
 */
export const fetchTicketsUnassigned = async ({
    ticketType,
    searchValue,
    limit = 20,
    offset = 0,
}: {
    ticketType: SnowTableName;
    searchValue?: string;
    limit?: number;
    offset?: number;
}): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        const baseUrl = getSnowTableEndpointByTicketType(ticketType);

        let query = `assigned_toISEMPTY^request_stateNOT INclosed_complete,closed_skipped,closed_incomplete,closed_cancelled,closed_rejected`;
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

        if ('result' in response?.data && isSnowTicketArray(response.data?.['result'])) {
            return response?.data?.['result'];
        } else {
            throw new Error('Failed to get the un-assigned tickets from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
