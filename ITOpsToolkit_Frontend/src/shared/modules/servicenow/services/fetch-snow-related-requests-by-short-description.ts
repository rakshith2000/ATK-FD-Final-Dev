import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export const fetchSnowRelatedRequestsByShortDescription = async ({
    keyword,
    currentTicketSysId,
}: {
    keyword?: string | null;
    currentTicketSysId?: string | null;
}): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        if (!keyword || keyword.trim().length <= 0) {
            throw new Error('No short description available for the selected ticket !', {
                cause: {
                    keyword,
                },
            });
        }

        const response = await serviceNowApiClient.get(
            appConfig.serviceNow.api.relatedRequestsByShortDescription
                .replaceAll(/<KEYWORD_PLACEHOLDER>/g, encodeURIComponent(keyword))
                .replaceAll(/<CURRENT_TICKET_SYSID>/g, String(currentTicketSysId)),
        );

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            const requests = response?.data.result;
            return requests;
        } else {
            throw new Error(`Unable to fetch related requests !`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
