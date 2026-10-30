import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { GetMimDetailsRequest, MimDataResponse } from '../types';
// import { SAMPLE_MIM_PAYLOAD } from '../mocks/sample-mim-data';
import { MimDataResponseSchema } from '../schemas/mim-details.schemas';

export const getMimDetails = async (payload: GetMimDetailsRequest): Promise<MimDataResponse> => {
    return withApiResponseHandler<MimDataResponse>(async () => {
        // return await MimDataResponseSchema.parseAsync(SAMPLE_MIM_PAYLOAD);
        const endpoint = appConfig.backend.api.get_mim_details;

        const response = await backendApiClient.post(endpoint, { incident_number: payload.incident_number });

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found in response');
        }

        return await MimDataResponseSchema.parseAsync(response?.data?.output?.data);
    });
};
