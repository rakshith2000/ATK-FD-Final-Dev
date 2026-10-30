import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { LLM } from '../types/llms';
import { appConfig } from '@/config/app-config';
import { LLMArraySchema } from '../schemas/llm.schemas';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';

const fetchLLMsListConfig = async () => {
    return withApiResponseHandler<Array<LLM>>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listLLMsWithConfig);

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found');
        }

        return await LLMArraySchema.parseAsync(response.data.output.data);
    });
};

export default fetchLLMsListConfig;
