import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { SnowTicket, SnowTableName } from '../types/ticket';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import { getSnowTableNameByTicketType } from '../utils/get-snow-table-by-ticket-type';

export const patchTicketBySysId = async ({
    ticketType,
    ticketId,
    changes,
}: {
    ticketType: SnowTableName;
    ticketId: string;
    changes: Record<string, unknown>;
}): Promise<SnowTicket> => {
    return withApiResponseHandler<SnowTicket>(async () => {
        if (appConfig?.isInDemoEnvironment) {
            globalAlertDialogEventBus.emit('show-dialog', {
                note: appConfig.demoEnvironmentActionMessage,
                severity: 'info',
                title: 'DEMO',
            });

            const demoMockData: SnowTicket = {};

            for (const key of Object.keys(changes)) {
                demoMockData[key] = {
                    display_value: (changes[key] as unknown as string) ?? '',
                    value: (changes[key] as unknown as string) ?? '',
                };
            }

            return demoMockData;
        }

        const tableName: string = getSnowTableNameByTicketType(ticketType);

        const response = await serviceNowApiClient.patch(
            appConfig.serviceNow.api.patchTicketBySysId.replaceAll(/<TICKET_TYPE_PLACEHOLDER>/g, tableName).replaceAll(/<SYS_ID_PLACEHOLDER>/g, ticketId),
            {
                ...changes,
            },
        );

        if ('result' in response?.data) {
            return response?.data.result;
        } else {
            throw new Error(`Unable to get updated ticket details from Service Now !`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
