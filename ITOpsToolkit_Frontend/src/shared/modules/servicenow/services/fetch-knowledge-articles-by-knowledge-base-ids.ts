import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { KnowledgeArticle, CategoryCount, ArticleCountItem } from '../types/knowledge';

// const fetchKnowledgeArticlesByKnowledgeBaseIds = async ({
//     getOnlyRecentKbs,
//     knowledgeBaseIds,
//     limit,
// }: {
//     knowledgeBaseIds: Array<string>;
//     getOnlyRecentKbs: boolean;
//     limit?: number;
// }): Promise<Array<KnowledgeArticle>> => {
//     let sysparm_query = `workflow_state=published^kb_knowledge_baseIN${knowledgeBaseIds.join(',')}`;

//     if (getOnlyRecentKbs) {
//         sysparm_query = sysparm_query + '^ORDERBYDESCsys_created_on';
//     }

//     const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeTable, {
//         params: {
//             sysparm_query: sysparm_query,
//             sysparm_fields: 'sys_id,rating,number,sys_created_on,text,short_description,kb_knowledge_base,workflow_state,kb_category,author',
//             sysparm_display_value: 'all',
//             ...(limit ? { sysparm_limit: limit } : {}),
//         },
//     });

//     const results = response?.data?.result;

//     if (isKnowledgeArticleArray(results)) {
//         return results;
//     }

//     throw new Error('Unable to retrieve the knowledge articles list from Service Now, failed to validate the response JSON Schema !', {
//         cause: {
//             reason: 'response?.data?.result schema is invalid !',
//         },
//     });
// };

const fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds = async (knowledgeBaseIds: Array<string>): Promise<Array<CategoryCount>> => {
    return withApiResponseHandler<Array<CategoryCount>>(async () => {
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
    });
};

/**
 * Fetches paginated knowledge articles for a specific category.
 * Used for infinite scroll loading - loads 10 articles per page by default.
 * For Uncategorised (empty categorySysId), fetches articles with empty kb_category field.
 */
export const fetchKbArticlesByCategory = async ({
    categorySysId,
    limit = 10,
    offset = 0,
    knowledgeBaseIds = [],
}: {
    categorySysId: string;
    limit?: number;
    offset?: number;
    knowledgeBaseIds?: Array<string>;
}): Promise<Array<KnowledgeArticle>> => {
    return withApiResponseHandler<Array<KnowledgeArticle>>(async () => {
        let sysparm_query: string;

        // For Uncategorised, include knowledge base IDs with ISEMPTY
        if (categorySysId === '') {
            sysparm_query = `kb_categoryISEMPTY^workflow_state=published^kb_knowledge_baseIN${knowledgeBaseIds.join(',')}^ORDERBYDESCsys_created_on`;
        } else {
            sysparm_query = `kb_category=${categorySysId}^workflow_state=published^ORDERBYDESCsys_created_on`;
        }

        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeTable, {
            params: {
                sysparm_query: sysparm_query,
                sysparm_fields: 'sys_id,rating,number,sys_created_on,text,short_description,kb_knowledge_base,workflow_state,kb_category,author',
                sysparm_display_value: 'all',
                sysparm_limit: limit,
                sysparm_offset: offset,
            },
        });

        if ('result' in response?.data && Array.isArray(response.data.result)) {
            return response.data.result as Array<KnowledgeArticle>;
        }

        logger.debug('Knowledge articles fetch failed', { responseData: response?.data });
        throw new Error('Unable to retrieve knowledge articles from Service Now !', {
            cause: {
                reason: 'response?.data?.result schema is invalid!',
            },
        });
    });
};

// export default fetchKnowledgeArticlesByKnowledgeBaseIds;
export { fetchKnowledgeArticlesCategoryCountByKnowledgeBaseIds };
