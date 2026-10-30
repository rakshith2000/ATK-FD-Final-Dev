import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { UpdateToolkitPackageConfigRequest, UpdateToolkitPackageConfigResponse } from '../types/prompt-library';
import { UpdateToolkitPackageConfigResponseSchema } from '../schemas/prompt-library.schemas';

const updateToolkitPackageConfig = async ({ payload }: { payload: UpdateToolkitPackageConfigRequest }) => {
    return withApiResponseHandler<UpdateToolkitPackageConfigResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }

        const response = await backendApiClient.post(appConfig.backend.api.updateToolkitPackageConfig, {
            ...payload,
        });

        return await UpdateToolkitPackageConfigResponseSchema.parseAsync(response.data.output);
    });
};

export default updateToolkitPackageConfig;
