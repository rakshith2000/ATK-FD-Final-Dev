import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import type { KnowledgeArticle } from '../types/knowledge-browser';
import { isKnowledgeArticleArray } from '../type-guards/knowledge-browser-guard';

const fetchKnowledgeArticlesByCategory = async (categorySysId: string | null, knowledgeBaseIds: Array<string> = []): Promise<Array<KnowledgeArticle>> => {
    let sysparm_query = '';

    // For Uncategorised, include knowledge base IDs with ISEMPTY
    if (categorySysId === null) {
        sysparm_query = `kb_categoryISEMPTY^workflow_state=published^kb_knowledge_baseIN${knowledgeBaseIds.join(',')}`;
    } else {
        // For regular categories, just use category ID
        sysparm_query = `kb_category=${categorySysId}^workflow_state=published`;
    }

    const response = await serviceNowApiClient.get(appConfig.serviceNow.api.knowledgeTable, {
        params: {
            sysparm_query: sysparm_query,
            sysparm_fields: 'sys_id,rating,number,sys_created_on,text,short_description,kb_knowledge_base,workflow_state,kb_category,author',
            sysparm_display_value: 'all',
        },
    });

    const results = response?.data?.result;

    if (isKnowledgeArticleArray(results)) {
        return results;
    }

    logger.debug('Knowledge articles by category response failed schema validation', { responseData: response?.data });
    throw new Error('Unable to retrieve the knowledge articles for this category from Service Now, failed to validate the response JSON Schema !', {
        cause: {
            reason: 'response?.data?.result schema is invalid !',
        },
    });
};

export default fetchKnowledgeArticlesByCategory;
