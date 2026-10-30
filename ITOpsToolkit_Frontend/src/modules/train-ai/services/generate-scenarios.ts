import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import type { GenerateScenariosRequest, GenerateScenariosResponse } from '../types/train-ai';
import { isGenerateScenariosResponse } from '../type-guards/train-ai.guadrs';

const generateScenarios = async (payload: GenerateScenariosRequest) => {
    return withApiResponseHandler<GenerateScenariosResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.generateScenarios, payload);

        if (response?.data?.output?.data && isGenerateScenariosResponse(response?.data?.output?.data)) {
            return response.data.output.data;
        } else {
            throw new Error('Unable to generate scenario, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default generateScenarios;
