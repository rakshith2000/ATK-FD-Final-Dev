import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { RecentKBArticle } from '../types';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { recentKBArticlesListSchema } from '../schema/recent-kb-article.schema';

const fetchRecentKbArticles = async () => {
    return withApiResponseHandler<Array<RecentKBArticle>>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listRecentKbArticles);

        return await recentKBArticlesListSchema.parseAsync(response?.data?.output?.data);
    });
};

export default fetchRecentKbArticles;
