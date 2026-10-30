import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { LLMTsListResponse } from '../types/llms';
import { appConfig } from '@/config/app-config';
import { LLMTsListResponseSchema } from '../schemas/llm.schemas';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';

const fetchLLMsList = async () => {
    return withApiResponseHandler<LLMTsListResponse>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listLLMs);

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found');
        }

        return await LLMTsListResponseSchema.parseAsync(response.data.output.data);
    });
};

export default fetchLLMsList;
