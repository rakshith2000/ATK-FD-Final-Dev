import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import { isSnowKbReadAccessArray } from '@/modules/knowledge-browser/type-guards/knowledge-browser-guard';

const fetchUserReadableKnowledgeBaseIdsByUserCriteria = async (userCriteriaIds: Array<string>): Promise<Array<string>> => {
    const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeBaseReadAccess, {
        params: {
            sysparm_query: `user_criteriaIN${userCriteriaIds.join(',')}`,
            sysparm_fields: 'kb_knowledge_base,user_criteria',
            sysparm_display_value: 'all',
        },
    });

    const results = response?.data?.result;

    if (!isSnowKbReadAccessArray(results)) {
        throw new Error('Unable to retrieve readable knowledge bases from Service Now, failed to validate the response JSON Schema !', {
            cause: { reason: 'response?.data?.result schema is invalid !' },
        });
    }

    const knowledgeBaseIds = results.map((mapping) => mapping.kb_knowledge_base.value).filter((value): value is string => typeof value === 'string' && value.length > 0);

    return [...new Set(knowledgeBaseIds)];
};

export default fetchUserReadableKnowledgeBaseIdsByUserCriteria;
