import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import type { UpdateKnowledgeArticleRequest, UpdateKnowledgeArticleResposne } from '../types/knowledge';
import { isUpdateKnowledgeArticleResponse } from '../type-guards/knowledge.guards';

const updateKnowledgeArticle = async ({ kb_category, kb_knowledge_base, short_description, text, author, workflow_state, number }: UpdateKnowledgeArticleRequest) => {
    return withApiResponseHandler<UpdateKnowledgeArticleResposne>(async () => {
        let kbSysId = '';

        const sysIdResponse = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeTable, {
            params: {
                sysparm_query: `number=${number}`,
                sysparm_fields: 'sys_id,number',
            },
        });

        if (sysIdResponse?.data?.result && Array.isArray(sysIdResponse?.data?.result) && !!sysIdResponse?.data?.result[0]?.sys_id) {
            kbSysId = sysIdResponse?.data?.result[0]?.sys_id;
        } else {
            throw new Error('Failed to get sys_id by kb_number for the required kb_article !');
        }

        const response = await serviceNowApiClient.patch(`${appConfig.serviceNow.api.knowledgeTable}/${kbSysId}`, {
            kb_category,
            kb_knowledge_base,
            short_description,
            text,
            workflow_state,
            author,
        });

        if (response?.data?.result && isUpdateKnowledgeArticleResponse(response?.data?.result)) {
            return response?.data?.result;
        } else {
            throw new Error('Unable to get the Updated KB article details, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default updateKnowledgeArticle;
