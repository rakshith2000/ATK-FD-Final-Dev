import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface TicketJournalEntry {
    sys_created_on: string;
    value: string;
    sys_created_by: string;
    element: string;
}

export const fetchSnowTicketJournalEntriesBySysId = async ({
    ticketId,
    limit = 20,
    offset = 0,
}: {
    ticketId: string;
    limit?: number;
    offset?: number;
}): Promise<Array<TicketJournalEntry>> => {
    return withApiResponseHandler<Array<TicketJournalEntry>>(async () => {
        let url = appConfig.serviceNow.api.ticketJournalEntriesTypeTicketSysId.replaceAll(/<TICKET_SYS_ID_PLACEHOLDER>/g, ticketId);
        url += `&sysparm_limit=${limit}&sysparm_offset=${offset}`;

        const response = await serviceNowApiClient.get(url);

        if ('result' in response?.data && Array.isArray(response.data?.['result'])) {
            const tickets = response?.data?.['result'];
            return tickets;
        } else {
            throw new Error('Failed to get the ticket journal entries from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
