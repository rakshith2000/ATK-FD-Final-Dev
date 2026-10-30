import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { KnowledgeArticle_From_List_API } from '../types';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { knowledgeArticlesFromListApiSchema } from '../schema/knowledge-article-from-list-api.schema';

const fetchKnowledgeArticles = async () => {
    return withApiResponseHandler<Array<KnowledgeArticle_From_List_API>>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listKnowledgeArticles);

        return await knowledgeArticlesFromListApiSchema.parseAsync(response?.data?.output?.data);
    });
};

export default fetchKnowledgeArticles;
