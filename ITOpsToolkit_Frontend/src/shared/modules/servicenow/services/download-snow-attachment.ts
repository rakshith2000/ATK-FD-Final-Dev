import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export const downloadSnowAttachment = async ({ attachmentSysId, fileName }: { attachmentSysId: string; fileName: string }): Promise<{ blob: Blob; filename: string }> => {
    return withApiResponseHandler(async () => {
        const endpoint = appConfig.serviceNow.api.ticketDownloadAttachment.replaceAll('<ATTACHMENT_SYS_ID_PLACEHOLDER>', attachmentSysId);

        const response = await serviceNowApiClient.get(endpoint, {
            responseType: 'blob',
        });

        const contentTypeHeader = String(response.headers['content-type'] || '');
        const blob = new Blob([response.data], {
            type: contentTypeHeader || 'application/octet-stream',
        });

        let filename = fileName || 'download';
        const contentDisposition = String(response.headers['content-disposition'] || '');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";]+)"?/);
            if (match && match[1]) {
                filename = match[1];
            }
        }

        return { blob, filename };
    });
};
