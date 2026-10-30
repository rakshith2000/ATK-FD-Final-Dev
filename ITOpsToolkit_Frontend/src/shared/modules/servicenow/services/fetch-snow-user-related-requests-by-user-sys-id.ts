import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export const fetchSnowUserRelatedRequestsByUserSysId = async ({
    userSysId,
    currentTicketSysId,
}: {
    userSysId?: string | null;
    currentTicketSysId?: string | null;
}): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        if (!userSysId || userSysId.trim().length <= 0) {
            throw new Error('No requested-for user available for the selected ticket !', {
                cause: {
                    userSysId,
                },
            });
        }

        const response = await serviceNowApiClient.get(
            appConfig.serviceNow.api.userRelatedRequestsByUserSysId
                .replaceAll(/<USER_SYS_ID_PLACEHOLDER>/g, String(userSysId))
                .replaceAll(/<CURRENT_TICKET_SYSID>/g, String(currentTicketSysId)),
        );

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            const requests = response?.data.result;
            return requests;
        } else {
            throw new Error(`Unable to fetch user related requests !`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
