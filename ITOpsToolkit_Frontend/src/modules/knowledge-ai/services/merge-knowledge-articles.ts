import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { MergedKnowledgeArticleResponse } from '../types';
import { mergedKnowledgeArticleResponseSchema } from '../schema/merged-knowledge-article-response.schema ';

const mergeKnowledgeArticles = async (articles: Record<string, string>, signal?: AbortSignal): Promise<MergedKnowledgeArticleResponse> => {
    return withApiResponseHandler<MergedKnowledgeArticleResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.mergeKbArticles, { ...articles }, { signal });

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found in response');
        }

        return await mergedKnowledgeArticleResponseSchema.parseAsync(response?.data?.output?.data);
    });
};

export default mergeKnowledgeArticles;
