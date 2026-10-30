import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { DeleteLLMRequest, DeleteLLMResponse } from '../types/llms';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { DeleteLLMResponseSchema } from '../schemas/llm.schemas';

const deleteLLM = async ({ llm_tag }: DeleteLLMRequest) => {
    return withApiResponseHandler<DeleteLLMResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }
        const response = await backendApiClient.post(appConfig.backend.api.deleteLLM, {
            llm_tag,
        });

        logger.debug(response?.data?.output);

        return await DeleteLLMResponseSchema.parseAsync(response.data.output);
    });
};

export default deleteLLM;
