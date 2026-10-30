import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { UpdateModuleConfigurationRequest, UpdateModuleConfigurationResponse } from '../types/prompt-library';
import { UpdateModuleConfigurationResponseSchema } from '../schemas/prompt-library.schemas';

const updateModuleConfiguration = async ({ payload }: { payload: UpdateModuleConfigurationRequest }) => {
    return withApiResponseHandler<UpdateModuleConfigurationResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }

        const response = await backendApiClient.post(appConfig.backend.api.updateModuleConfiguration, {
            ...payload,
        });

        return await UpdateModuleConfigurationResponseSchema.parseAsync(response.data.output);
    });
};

export default updateModuleConfiguration;
