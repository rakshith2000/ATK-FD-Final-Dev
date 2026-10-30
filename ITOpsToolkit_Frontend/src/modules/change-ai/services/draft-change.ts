import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { DraftChangeResponseSchema } from '../schemas/change-ai.schemas';
import type { DraftChangeRequest, DraftChangeResponse } from '../types/change-ai';

const draftChange = async (payload: DraftChangeRequest): Promise<DraftChangeResponse> => {
    return withApiResponseHandler<DraftChangeResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.draftChange, {
            ...payload,
        });

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found');
        }

        return await DraftChangeResponseSchema.parseAsync(response.data.output.data);
    });
};

export default draftChange;
