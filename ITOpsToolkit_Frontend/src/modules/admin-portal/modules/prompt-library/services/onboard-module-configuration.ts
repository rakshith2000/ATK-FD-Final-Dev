import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { OnboardModuleConfigurationRequest, OnboardModuleConfigurationResponse } from '../types/prompt-library';
import { OnboardModuleConfigurationResponseSchema } from '../schemas/prompt-library.schemas';

const onboardModuleConfiguration = async ({ payload }: { payload: OnboardModuleConfigurationRequest }) => {
    return withApiResponseHandler<OnboardModuleConfigurationResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }

        const response = await backendApiClient.post(appConfig.backend.api.onboardModuleConfiguration, {
            ...payload,
        });

        return await OnboardModuleConfigurationResponseSchema.parseAsync(response.data.output);
    });
};

export default onboardModuleConfiguration;
