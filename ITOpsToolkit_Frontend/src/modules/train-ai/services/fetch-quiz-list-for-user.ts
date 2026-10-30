import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { isQuizListResponse } from '../type-guards/train-ai.guadrs';
import type { QuizListResponse } from '../types/train-ai';

const fetchQuizListForUser = async () => {
    return withApiResponseHandler<QuizListResponse>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listQuizzesForUser);

        if (response?.data?.output?.data && isQuizListResponse(response?.data?.output?.data)) {
            return response.data.output.data;
        } else {
            throw new Error('Unable to fetch the quiz list for user, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default fetchQuizListForUser;
