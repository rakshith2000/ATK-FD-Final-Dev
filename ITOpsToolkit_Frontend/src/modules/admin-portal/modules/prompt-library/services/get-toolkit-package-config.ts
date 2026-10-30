import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { GetToolkitPackageConfigRequest, GetToolkitPackageConfigResponse } from '../types/prompt-library';
import { GetToolkitPackageConfigResponseSchema } from '../schemas/prompt-library.schemas';

const getToolkitPackageConfig = async ({ payload }: { payload: GetToolkitPackageConfigRequest }) => {
    return withApiResponseHandler<GetToolkitPackageConfigResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.getToolkitPackageConfig, {
            ...payload,
        });

        const data = response?.data?.output?.data;

        if (!data) {
            throw new Error('response?.data?.output?.data not found');
        }

        return await GetToolkitPackageConfigResponseSchema.parseAsync(data);
    });
};

export default getToolkitPackageConfig;
