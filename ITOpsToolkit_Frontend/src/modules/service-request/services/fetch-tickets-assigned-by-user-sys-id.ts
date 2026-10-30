import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import { isSnowTicketArray } from '@/shared/modules/servicenow/type-guards/ticket.guards';
import type { SnowTicket, SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { getSnowTableEndpointByTicketType } from '@/shared/modules/servicenow/utils/get-snow-table-by-ticket-type';

/**
 * Fetches a page of tickets of the given type assigned to the currently signed-in user.
 *
 * Mirrors the Incident AI paginated fetch (limit/offset + optional server-side
 * search on number / short description), but is parameterized by `ticketType`
 * so it can target any ticket table (sc_request, incident, ...). The state
 * exclusion (`stateNOT IN3,4,7`) hides the closed sc_request states
 * (3 = Closed Complete, 4 = Closed Incomplete, 7 = Closed Skipped).
 */
export const fetchTicketsAssignedByUserSysId = async ({
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
        const { sys_id } = await getAuthProviderInstance().getUserSnowDetails();

        const baseUrl = getSnowTableEndpointByTicketType(ticketType);

        let query = `assigned_to=${sys_id}^request_stateNOT INclosed_complete,closed_skipped,closed_incomplete,closed_cancelled,closed_rejected`;
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

        if ('result' in response?.data && isSnowTicketArray(response.data['result'])) {
            return response.data['result'];
        } else {
            throw new Error('Failed to get the user assigned tickets from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
