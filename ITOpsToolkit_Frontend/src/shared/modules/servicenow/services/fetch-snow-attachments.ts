import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { normalizeSnowAttachment } from '../utils/normalize-snow-attachment';
import type { SnowAttachmentItem, SnowNormalizedAttachment } from '../types/attachment';
import type { SnowTableName } from '../types/ticket';
import { getSnowTableNameByTicketType } from '../utils/get-snow-table-by-ticket-type';

export const fetchSnowAttachments = async ({ tableName, tableSysId }: { tableName: SnowTableName; tableSysId: string }): Promise<SnowNormalizedAttachment[]> => {
    return withApiResponseHandler<SnowNormalizedAttachment[]>(async () => {
        const snowTableName: string = getSnowTableNameByTicketType(tableName);

        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.ticketAttachments, {
            params: {
                sysparm_query: `table_name=${snowTableName}^table_sys_id=${tableSysId}`,
                sysparm_display_value: 'all',
            },
        });

        if ('result' in response?.data && Array.isArray(response.data.result)) {
            return (response.data.result as SnowAttachmentItem[]).map(normalizeSnowAttachment);
        } else {
            throw new Error(`Unable to fetch attachments from ServiceNow!`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid or not an array!',
                },
            });
        }
    });
};
