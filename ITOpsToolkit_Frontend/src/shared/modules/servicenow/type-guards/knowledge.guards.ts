import type { CreateKnowledgeArticleResposne, KnowledgeArticle, UpdateKnowledgeArticleResposne } from '../types/knowledge';
import { isSnowFieldWithValueAndDisplayText } from './index.guards';

export function isKnowledgeArticle(obj: unknown): obj is KnowledgeArticle {
    if (typeof obj !== 'object' || obj === null) return false;

    const record = obj as Record<string, unknown>;

    const requiredFields: (keyof KnowledgeArticle)[] = [
        'sys_id',
        'number',
        'short_description',
        'kb_knowledge_base',
        'sys_created_on',
        'author',
        'rating',
        'workflow_state',
        'text',
        'kb_category',
    ];

    return requiredFields.every((field) => isSnowFieldWithValueAndDisplayText(record[field]));
}

export function isKnowledgeArticleArray(obj: unknown): obj is Array<KnowledgeArticle> {
    return Array.isArray(obj) && obj.every(isKnowledgeArticle);
}

export function isCreateKnowledgeArticleResponse(value: unknown): value is CreateKnowledgeArticleResposne {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as CreateKnowledgeArticleResposne).number === 'string' &&
        typeof (value as CreateKnowledgeArticleResposne).sys_id === 'string'
    );
}

export function isUpdateKnowledgeArticleResponse(value: unknown): value is UpdateKnowledgeArticleResposne {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as UpdateKnowledgeArticleResposne).number === 'string' &&
        typeof (value as UpdateKnowledgeArticleResposne).sys_id === 'string'
    );
}
