import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import logger from '@/shared/utils/logger';
import type { CategoryCount, ArticleCountItem } from '@/shared/modules/servicenow/types/knowledge';
import { isSnowUserCriteriaArray, isSnowKbReadAccessArray } from '../type-guards/knowledge-browser-guard';

/**
 * Resolves the `user_criteria` records that reference the currently signed-in user.
 *
 * ServiceNow stores `user` on `user_criteria` as a glide-list (a comma-separated
 * list of user sys_ids), so we match with `LIKE` against the user's sys_id rather
 * than an exact `=` comparison. Returns the criteria sys_ids.
 */
const fetchUserCriteriaIds = async (userSysId: string): Promise<Array<string>> => {
    const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeUserCriteria, {
        params: {
            sysparm_query: `userLIKE${userSysId}`,
            sysparm_fields: 'sys_id,name',
            sysparm_display_value: true,
        },
    });

    const results = response?.data?.result;
    if (!isSnowUserCriteriaArray(results)) {
        logger.debug('user_criteria response failed schema validation', { responseData: response?.data });
        throw new Error('Unable to retrieve user criteria from Service Now, failed to validate the response JSON Schema !', {
            cause: { reason: 'response?.data?.result schema is invalid !' },
        });
    }

    return results.map((criteria) => criteria.sys_id).filter((sysId) => sysId.length > 0);
};

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

const fetchArticlesCountByCategory = async (knowledgeBaseIds: Array<string>): Promise<Array<CategoryCount>> => {
    const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeArticlescount, {
        params: {
            sysparm_count: true,
            sysparm_group_by: 'kb_category',
            sysparm_query: `kb_knowledge_baseIN${knowledgeBaseIds.join(',')}^workflow_state=published`,
            sysparm_display_value: 'all',
        },
    });

    const results = response?.data?.result;
    if (Array.isArray(results)) {
        return results.map((item: ArticleCountItem) => {
            const firstGroupByField = item.groupby_fields?.[0];
            const categoryValue = (firstGroupByField?.value || '').toString().trim();
            const displayValue = (firstGroupByField?.display_value || categoryValue || '').toString().trim();
            const countValue = item.stats?.count ?? 0;
            const count = typeof countValue === 'string' ? parseInt(countValue, 10) : countValue;
            return {
                categorySysId: categoryValue || null,
                categoryId: categoryValue || null,
                categoryName: displayValue || 'Uncategorised',
                count: Number.isNaN(count) ? 0 : count,
            };
        });
    }

    logger.debug('Knowledge articles count response failed', { responseData: response?.data });
    throw new Error('Unable to retrieve the knowledge articles count from Service Now !', {
        cause: {
            reason: 'response?.data?.result is invalid !',
        },
    });
};

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
const fetchKnowledgeArticleCountsByCategory = async (): Promise<Array<CategoryCount>> => {
    return withApiResponseHandler<Array<CategoryCount>>(async () => {
        const { sys_id: userSysId } = await getAuthProviderInstance().getUserSnowDetails();
        if (!userSysId) return [];

        const userCriteriaIds = await fetchUserCriteriaIds(userSysId);
        if (userCriteriaIds.length === 0) return [];

        const knowledgeBaseIds = await fetchReadableKnowledgeBaseIds(userCriteriaIds);
        if (knowledgeBaseIds.length === 0) return [];

        return await fetchArticlesCountByCategory(knowledgeBaseIds);
    });
};

export default fetchKnowledgeArticleCountsByCategory;
