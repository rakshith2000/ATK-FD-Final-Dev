// import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { PushChangesRequest, PushChangesResponse } from '../types/change-ai';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { PushChangesResponseSchema } from '../schemas/change-ai.schemas';

const pushChangeRequestToItsm = async (payload: PushChangesRequest): Promise<PushChangesResponse> => {
    return withApiResponseHandler<PushChangesResponse>(async () => {
        const response = await serviceNowApiClient.post(appConfig.serviceNow.api.changeRequestTable, {
            ...payload,
        });

        if (!response?.data?.result) {
            throw new Error('response?.data?.result not found');
        }

        return await PushChangesResponseSchema.parseAsync(response.data.result);
    });
};

export default pushChangeRequestToItsm;
