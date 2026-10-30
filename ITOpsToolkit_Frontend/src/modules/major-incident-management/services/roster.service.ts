import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export type RosterConfigFileType = 'template' | 'actual';

export interface UploadShiftRosterResponse {
    message?: string;
    status?: string;
    [key: string]: unknown;
}

export const uploadShiftRoster = async (file: File): Promise<UploadShiftRosterResponse> => {
    return withApiResponseHandler<UploadShiftRosterResponse>(async () => {
        const endpoint = appConfig.backend.api.upload_shift_roaster;
        const formData = new FormData();
        formData.append('file', file);

        const response = await backendApiClient.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response?.data ?? { message: 'Shift roster uploaded successfully' };
    });
};

export const downloadRosterFile = async (fileType: RosterConfigFileType): Promise<{ blob: Blob; filename: string }> => {
    return withApiResponseHandler(async () => {
        const endpoint = appConfig.backend.api.download_roaster_file;

        const response = await backendApiClient.get(endpoint, {
            params: { file_type: fileType },
            responseType: 'blob',
        });

        const contentTypeHeader = String(response.headers['content-type'] || '');
        const blob = new Blob([response.data], {
            type: contentTypeHeader || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        let filename = fileType === 'template' ? `Sample_Roster_${new Date().toISOString().slice(0, 10)}.xlsx` : `Roster_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

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
