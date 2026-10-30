import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { SnowTicket, SnowTableName } from '../types/ticket';
import { getSnowTableNameByTicketType } from '../utils/get-snow-table-by-ticket-type';

export const fetchSnowUnassignedTicketsByTicketType = async ({ ticketType }: { ticketType: SnowTableName }): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        const tableName: string = getSnowTableNameByTicketType(ticketType);

        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.ticketsUnassignedByTicketType.replaceAll(/<TICKET_TYPE_PLACEHOLDER>/g, tableName));

        if ('result' in response?.data && Array.isArray(response.data?.['result'])) {
            const tickets = response?.data?.['result'];
            return tickets;
        } else {
            throw new Error('Failed to get the un-assgiend tickets from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
