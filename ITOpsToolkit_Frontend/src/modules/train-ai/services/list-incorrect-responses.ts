import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import type { QuizQuestion } from '../types/train-ai';
import { isQuizQuestionsResponse } from '../type-guards/train-ai.guadrs';

interface ListIncorrectResponsesPayload {
    user_id: string;
    quiz_code: string;
}

const listIncorrectResponses = async (payload: ListIncorrectResponsesPayload) => {
    return withApiResponseHandler<QuizQuestion[]>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.listQuestionsWithIncorrectResponses, payload);

        if (response?.data?.output?.data && isQuizQuestionsResponse(response?.data?.output?.data)) {
            return response.data.output.data;
        } else {
            throw new Error('Unable to fetch incorrect responses, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default listIncorrectResponses;
