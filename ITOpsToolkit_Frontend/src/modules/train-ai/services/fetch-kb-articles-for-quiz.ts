import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { newQuizKbArticlesResponseSchema } from '../schemas/train-ai.schemas';
import type { NewQuizKbArticlesResponse } from '../types/train-ai';

const fetchKbArticlesForQuiz = async () => {
    return withApiResponseHandler<NewQuizKbArticlesResponse>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listKnowledgeArticles);
        const payload = response?.data?.output?.data;

        const parsed = newQuizKbArticlesResponseSchema.safeParse(payload);

        if (parsed.success) {
            return parsed.data as NewQuizKbArticlesResponse;
        }

        if (Array.isArray(payload)) {
            return payload as NewQuizKbArticlesResponse;
        }

        return [] as NewQuizKbArticlesResponse;
    });
};

export default fetchKbArticlesForQuiz;
