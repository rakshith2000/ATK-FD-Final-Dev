import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import type { CreateKnowledgeArticleRequest, CreateKnowledgeArticleResposne } from '../types/knowledge';
import { isCreateKnowledgeArticleResponse } from '../type-guards/knowledge.guards';

const createKnowledgeArticle = async ({ kb_category, kb_knowledge_base, short_description, text, author, workflow_state }: CreateKnowledgeArticleRequest) => {
    return withApiResponseHandler<CreateKnowledgeArticleResposne>(async () => {
        const response = await serviceNowApiClient.post(appConfig.serviceNow.api.knowledgeTable, {
            kb_category,
            kb_knowledge_base,
            short_description,
            text,
            workflow_state,
            author,
        });

        if (response?.data?.result && isCreateKnowledgeArticleResponse(response?.data?.result)) {
            return response?.data?.result;
        } else {
            throw new Error('Unable to get the created KB article details, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'esponse?.data?.result schemea is invalid !',
                },
            });
        }
    });
};

export default createKnowledgeArticle;
