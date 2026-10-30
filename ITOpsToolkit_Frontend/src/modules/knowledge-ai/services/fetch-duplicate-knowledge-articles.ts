import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { DuplicateKBCatalog } from '../types';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { duplicateKBCatalogSchema } from '../schema/duplicate-kb-catalog.schema';

const fetchDuplicateKnowledgeArticles = async () => {
    return withApiResponseHandler<DuplicateKBCatalog>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listDuplicateKnowledgeArticles);

        return await duplicateKBCatalogSchema.parseAsync(response?.data?.output?.data);
    });
};

export default fetchDuplicateKnowledgeArticles;
