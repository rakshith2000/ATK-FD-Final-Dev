import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import type { SubmitQuizRequest, SubmitQuizResponse } from '../types/train-ai';
import { isSubmitQuizResponse } from '../type-guards/train-ai.guadrs';

const submitQuiz = async (payload: SubmitQuizRequest) => {
    return withApiResponseHandler<SubmitQuizResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.submitQuiz, payload);

        if (response?.data?.output?.data && isSubmitQuizResponse(response?.data?.output?.data)) {
            return response.data.output.data;
        } else {
            throw new Error('Unable to submit quiz, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default submitQuiz;
