import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { OnboardLLMRequest, OnboardLLMResponse } from '../types/llms';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { OnboardLLMResponseSchema } from '../schemas/llm.schemas';

const onboardLLM = async ({ payload }: { payload: OnboardLLMRequest }) => {
    return withApiResponseHandler<OnboardLLMResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }
        const response = await backendApiClient.post(appConfig.backend.api.onboardLLM, {
            ...payload,
        });

        logger.debug(response?.data?.output);

        return await OnboardLLMResponseSchema.parseAsync(response.data.output);
    });
};

export default onboardLLM;
