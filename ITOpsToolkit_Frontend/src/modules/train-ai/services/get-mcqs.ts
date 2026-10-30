import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import type { GetMcqsRequest, GetMcqsResponse } from '../types/train-ai';
import { isGetMcqsResponse } from '../type-guards/train-ai.guadrs';

const getMcqs = async (payload: GetMcqsRequest) => {
    return withApiResponseHandler<GetMcqsResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.getMcqs, payload);

        if (response?.data?.output?.data && isGetMcqsResponse(response?.data?.output?.data)) {
            return response.data.output.data;
        } else {
            throw new Error('Unable to fetch quiz questions, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default getMcqs;
