import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
// import { isDraftChangeResponse } from '../type-guard/change-ai.guard';
// import type { DraftChangeRequest, DraftChangeResponse } from '../types/change-ai';

export interface uploadDraftImage {
    message?: string;
    status?: string;
    [key: string]: unknown;
}

export const uploadDraftImage = async (file: File): Promise<uploadDraftImage> => {
    return withApiResponseHandler<uploadDraftImage>(async () => {
        const endpoint = appConfig.backend.api.uploadDraftImage;
        const formData = new FormData();
        formData.append('file', file);

        const response = await backendApiClient.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response?.data ?? { message: 'Image uploaded successfully' };
    });
};

export default uploadDraftImage;
