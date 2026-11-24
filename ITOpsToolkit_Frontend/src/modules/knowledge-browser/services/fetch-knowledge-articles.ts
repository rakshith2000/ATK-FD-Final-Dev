import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import logger from '@/shared/utils/logger';
import fetchSnowUserCriteriaIdsBySysId from '@/shared/modules/servicenow/services/fetch-snow-user-criteria-ids-by-user-sys-id';
import { fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds } from '@/shared/modules/servicenow/services/fetch-knowledge-articles-by-knowledge-base-ids';
import { isSnowKbReadAccessArray } from '../type-guards/knowledge-browser-guard';

/**
 * Given the user's `user_criteria` sys_ids, resolves the distinct knowledge-base
 * sys_ids the user is allowed to read via the `kb_uc_can_read_mtom` mapping table.
 *
 * Queried with `sysparm_display_value=all`, so `kb_knowledge_base` comes back as a
 * `{ display_value, value, link }` reference field — we key off `value` (the sys_id).
 */
const fetchReadableKnowledgeBaseIds = async (userCriteriaIds: Array<string>): Promise<Array<string>> => {
    const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeBaseReadAccess, {
        params: {
            sysparm_query: `user_criteriaIN${userCriteriaIds.join(',')}`,
            sysparm_fields: 'kb_knowledge_base,user_criteria',
            sysparm_display_value: 'all',
        },
    });

    const results = response?.data?.result;
    if (!isSnowKbReadAccessArray(results)) {
        logger.debug('kb_uc_can_read_mtom response failed schema validation', { responseData: response?.data });
        throw new Error('Unable to retrieve readable knowledge bases from Service Now, failed to validate the response JSON Schema !', {
            cause: { reason: 'response?.data?.result schema is invalid !' },
        });
    }

    const knowledgeBaseIds = results.map((mapping) => mapping.kb_knowledge_base.value).filter((value): value is string => typeof value === 'string' && value.length > 0);

    // The mapping table can list a knowledge base against several criteria, so de-dupe.
    return [...new Set(knowledgeBaseIds)];
};

type KnowledgeCategoryCounts = Awaited<ReturnType<typeof fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds>>;

/**
 * Builds the knowledge-browser catalog directly from ServiceNow instead of the backend
 * aggregator endpoint. It walks the same chain the backend used to:
 *   1. current user -> `user_criteria` records
 *   2. `user_criteria` -> readable knowledge bases (`kb_uc_can_read_mtom`)
 *   3. readable knowledge bases -> published `kb_knowledge` articles
 *
 * The final article list matches the shape the UI already consumes, so downstream
 * grouping / rendering keeps working unchanged.
 */
const fetchKnowledgeArticleCountsByCategory = async (): Promise<KnowledgeCategoryCounts> => {
    return withApiResponseHandler<KnowledgeCategoryCounts>(async () => {
        const { sys_id: userSysId } = await getAuthProviderInstance().getUserSnowDetails();
        if (!userSysId) return [];

        const userCriteriaIds = await fetchSnowUserCriteriaIdsBySysId(userSysId);
        if (userCriteriaIds.length === 0) return [];

        const knowledgeBaseIds = await fetchReadableKnowledgeBaseIds(userCriteriaIds);
        if (knowledgeBaseIds.length === 0) return [];

        return fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds(knowledgeBaseIds);
    });
};

export default fetchKnowledgeArticleCountsByCategory;
