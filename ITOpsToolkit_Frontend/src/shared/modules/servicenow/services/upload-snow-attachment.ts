import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { normalizeSnowAttachment } from '../utils/normalize-snow-attachment';
import type { SnowAttachmentItem, SnowNormalizedAttachment } from '../types/attachment';
import { getSnowTableNameByTicketType } from '../utils/get-snow-table-by-ticket-type';
import type { SnowTableName } from '../types/ticket';

export const uploadSnowAttachment = async ({ tableName, tableSysId, file }: { tableName: SnowTableName; tableSysId: string; file: File }): Promise<SnowNormalizedAttachment> => {
    return withApiResponseHandler<SnowNormalizedAttachment>(async () => {
        const snowTableName: string = getSnowTableNameByTicketType(tableName);

        const response = await serviceNowApiClient.post(appConfig.serviceNow.api.ticketUploadAttachment, file, {
            params: {
                table_name: snowTableName,
                table_sys_id: tableSysId,
                file_name: file.name,
            },
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
            },
        });

        if ('result' in response?.data && response.data.result) {
            return normalizeSnowAttachment(response.data.result as SnowAttachmentItem);
        } else {
            throw new Error(`Failed to upload attachment to ServiceNow!`, {
                cause: {
                    reason: 'response?.data?.result is missing from ServiceNow response',
                },
            });
        }
    });
};
