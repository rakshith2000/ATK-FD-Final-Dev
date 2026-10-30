import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { GetModuleConfigsRequest, GetModuleConfigsResponse } from '../types/prompt-library';
import { GetModuleConfigsResponseSchema } from '../schemas/prompt-library.schemas';

const getModuleConfigs = async ({ payload }: { payload: GetModuleConfigsRequest }) => {
    return withApiResponseHandler<GetModuleConfigsResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.getModuleConfigs, {
            ...payload,
        });

        return await GetModuleConfigsResponseSchema.parseAsync(response.data.output);
    });
};

export default getModuleConfigs;
