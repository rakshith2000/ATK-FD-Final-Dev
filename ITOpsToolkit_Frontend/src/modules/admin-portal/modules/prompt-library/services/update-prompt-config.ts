import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { UpdatePromptConfigRequest, UpdatePromptConfigResponse } from '../types/prompt-library';
import { UpdatePromptConfigResponseSchema } from '../schemas/prompt-library.schemas';

const updatePromptConfig = async ({ payload }: { payload: UpdatePromptConfigRequest }) => {
    return withApiResponseHandler<UpdatePromptConfigResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }

        const response = await backendApiClient.post(appConfig.backend.api.updateAgentDefination, {
            ...payload,
            // instructions: payload.instruction, // Mapping instruction to instructions for backward compatibility with backend API
        });

        return await UpdatePromptConfigResponseSchema.parseAsync(response.data.output);
    });
};

export default updatePromptConfig;
