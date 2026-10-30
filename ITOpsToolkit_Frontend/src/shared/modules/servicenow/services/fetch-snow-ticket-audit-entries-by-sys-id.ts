import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface TicketAuditEntry {
    sys_created_on: string;
    fieldname: string;
    oldvalue: string;
    newvalue: string;
    sys_created_by: string;
}

export const fetchSnowTicketAuditEntriesBySysId = async ({
    ticketId,
    limit = 20,
    offset = 0,
}: {
    ticketId: string;
    limit?: number;
    offset?: number;
}): Promise<Array<TicketAuditEntry>> => {
    return withApiResponseHandler<Array<TicketAuditEntry>>(async () => {
        let url = appConfig.serviceNow.api.ticketAuditEntriesTypeTicketSysId.replaceAll(/<TICKET_SYS_ID_PLACEHOLDER>/g, ticketId);
        url += `&sysparm_limit=${limit}&sysparm_offset=${offset}`;

        const response = await serviceNowApiClient.get(url);

        if ('result' in response?.data && Array.isArray(response.data?.['result'])) {
            const auditLogs = response?.data?.['result'];
            return auditLogs;
        } else {
            throw new Error('Failed to get the ticket audit entries from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
