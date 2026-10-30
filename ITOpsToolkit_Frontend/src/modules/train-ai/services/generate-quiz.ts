import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import type { GenerateQuizResponse, QuizDifficultyLevel } from '../types/train-ai';
import { isGenerateQuizResponse } from '../type-guards/train-ai.guadrs';

const generateQuiz = async (articlesNumber: string[], difficultyLevel: QuizDifficultyLevel) => {
    return withApiResponseHandler<GenerateQuizResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.generateMcqs, {
            articles_number: articlesNumber,
            difficulty_level: difficultyLevel,
        });

        if (response?.data?.output?.data && isGenerateQuizResponse(response?.data?.output?.data)) {
            return response.data.output.data;
        } else {
            throw new Error('Unable to generate quiz, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default generateQuiz;
