import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import fetchSnowUserCriteriaIdsBySysId from './fetch-snow-user-criteria-ids-by-user-sys-id';
import fetchUserReadableKnowledgeBaseIdsByUserCriteria from './fetch-user-readable-knowledge-base-ids-by-user-criteria';
import { fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds } from './fetch-knowledge-articles-by-knowledge-base-ids';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import type { KnowledgeArticle, CategoryCount } from '../types/knowledge';

const fetchUserReadableKnowledgeCategoryCounts = async (): Promise<Array<CategoryCount>> => {
    return withApiResponseHandler<Array<CategoryCount>>(async () => {
        const { sys_id: userSysId } = await getAuthProviderInstance().getUserSnowDetails();
        if (!userSysId) return [];

        const userCriteriaIds = await fetchSnowUserCriteriaIdsBySysId(userSysId);
        if (userCriteriaIds.length === 0) return [];

        const knowledgeBaseIds = await fetchUserReadableKnowledgeBaseIdsByUserCriteria(userCriteriaIds);
        if (knowledgeBaseIds.length === 0) return [];

        return fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds(knowledgeBaseIds);
    });
};

const fetchUserKnowledgeBaseIds = async (): Promise<Array<string>> => {
    return withApiResponseHandler<Array<string>>(async () => {
        const { sys_id: userSysId } = await getAuthProviderInstance().getUserSnowDetails();
        if (!userSysId) return [];

        const userCriteriaIds = await fetchSnowUserCriteriaIdsBySysId(userSysId);
        if (userCriteriaIds.length === 0) return [];

        const knowledgeBaseIds = await fetchUserReadableKnowledgeBaseIdsByUserCriteria(userCriteriaIds);
        return knowledgeBaseIds;
    });
};

const fetchRecentUserReadableKnowledgeArticles = async (limit: number = 10): Promise<Array<KnowledgeArticle>> => {
    return withApiResponseHandler<Array<KnowledgeArticle>>(async () => {
        const { sys_id: userSysId } = await getAuthProviderInstance().getUserSnowDetails();
        if (!userSysId) return [];

        const userCriteriaIds = await fetchSnowUserCriteriaIdsBySysId(userSysId);
        if (userCriteriaIds.length === 0) return [];

        const knowledgeBaseIds = await fetchUserReadableKnowledgeBaseIdsByUserCriteria(userCriteriaIds);
        if (knowledgeBaseIds.length === 0) return [];

        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeTable, {
            params: {
                sysparm_query: `kb_knowledge_baseIN${knowledgeBaseIds.join(',')}^workflow_state=published^ORDERBYDESCsys_created_on`,
                sysparm_fields: 'sys_id,rating,number,sys_created_on,text,short_description,kb_knowledge_base,workflow_state,kb_category,author',
                sysparm_display_value: 'all',
                sysparm_limit: limit,
            },
        });

        if ('result' in response?.data && Array.isArray(response.data.result)) {
            return response.data.result as Array<KnowledgeArticle>;
        }

        logger.debug('Recent knowledge articles fetch failed', { responseData: response?.data });
        throw new Error('Unable to retrieve recent knowledge articles from Service Now !', {
            cause: {
                reason: 'response?.data?.result schema is invalid!',
            },
        });
    });
};

export default fetchUserReadableKnowledgeCategoryCounts;
export { fetchUserKnowledgeBaseIds, fetchRecentUserReadableKnowledgeArticles };
