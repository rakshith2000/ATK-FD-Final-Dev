import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { SnowTicket, SnowTableName } from '../types/ticket';
import { isSnowTicketArray } from '../type-guards/ticket.guards';
import { getSnowTableNameByTicketType } from '../utils/get-snow-table-by-ticket-type';

export const fetchSnowAssignedTicketsByGroupQuery = async ({ ticketType, groupQuery }: { ticketType: SnowTableName; groupQuery: string }): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        const tableName: string = getSnowTableNameByTicketType(ticketType);

        const response = await serviceNowApiClient.get(
            appConfig.serviceNow.api.ticketsAssignedByGroupQuery.replaceAll(/<TICKET_TYPE_PLACEHOLDER>/g, tableName).replaceAll(/<GROUP_QUERY>/g, groupQuery),
        );

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
