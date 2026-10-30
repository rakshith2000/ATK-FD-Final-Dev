import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { isQuizResponse } from '../type-guard/train-ai.guard';
import type { QuizRecord } from '../types/train-ai';

const fetchQuizzes = async (): Promise<QuizRecord[]> => {
    return withApiResponseHandler<QuizRecord[]>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listAllQuizzes);

        if (response?.data?.output && isQuizResponse(response?.data?.output)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to get the quizzes response from API !, response?.data?.output schema is invalid !');
        }
    });
};

export default fetchQuizzes;
