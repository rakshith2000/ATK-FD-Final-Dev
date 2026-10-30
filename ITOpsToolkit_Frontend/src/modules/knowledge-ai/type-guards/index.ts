import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import type {
    DuplicateKBArticleMap,
    DuplicateKBCatalog,
    DuplicateKBCategoryMap,
    RecentKBArticle,
    MergedKnowledgeArticleResponse,
    KnowledgeArticle,
    KnowledgeArticle_From_List_API,
    DisplayValue,
} from '../types';
import { displayValueSchema, knowledgeArticleFromListApiSchema, knowledgeArticlesFromListApiSchema } from '../schema/knowledge-article-from-list-api.schema';
import { recentKBArticleSchema, recentKBArticlesListSchema } from '../schema/recent-kb-article.schema';

export function isKnowledgeArticle(obj: unknown): obj is KnowledgeArticle {
    if (typeof obj !== 'object' || obj === null) return false;

    const article = obj as Record<string, unknown>;

    if (typeof article.content !== 'string') return false;
    if (typeof article.kb_metadata !== 'object' || article.metadata === null) return false;

    const kb_metadata = article.kb_metadata as Record<string, unknown>;

    return (
        Array.isArray(kb_metadata.roles) &&
        (kb_metadata.roles as unknown[]).every((role) => typeof role === 'string') &&
        typeof kb_metadata.title === 'string' &&
        typeof kb_metadata.author === 'string' &&
        typeof kb_metadata.number === 'string' &&
        typeof kb_metadata.rating === 'string' &&
        typeof kb_metadata.kb_link === 'string' &&
        typeof kb_metadata.kb_category === 'string' &&
        typeof kb_metadata.kb_knowledge_base === 'string'
    );
}

export function isDisplayValue(obj: unknown): obj is DisplayValue {
    return displayValueSchema.safeParse(obj).success;
}

export function isKnowledgeArticle_From_List_API(obj: unknown): obj is KnowledgeArticle_From_List_API {
    return knowledgeArticleFromListApiSchema.safeParse(obj).success;
}

export function isKnowledgeArticle_From_List_API_Array(obj: unknown): obj is KnowledgeArticle_From_List_API[] {
    return knowledgeArticlesFromListApiSchema.safeParse(obj).success;
}

export function isKnowledgeArticleArray(obj: unknown): obj is KnowledgeArticle[] {
    return Array.isArray(obj) && obj.every(isKnowledgeArticle);
}

export function isRecentKB(obj: unknown): obj is RecentKBArticle {
    return recentKBArticleSchema.safeParse(obj).success;
}

export function isRecentKBArray(obj: unknown): obj is RecentKBArticle[] {
    return recentKBArticlesListSchema.safeParse(obj).success;
}

export function isIssueWithoutKB(obj: unknown): obj is IssueWithoutKBArticle {
    if (typeof obj !== 'object' || obj === null) return false;

    const incident = obj as Record<string, unknown>;

    return (
        typeof incident.short_description === 'string' &&
        typeof incident.comments === 'string' &&
        typeof incident.assignment_group === 'string' &&
        typeof incident.cmdb_ci === 'string' &&
        typeof incident.description === 'string' &&
        typeof incident.priority === 'string' &&
        typeof incident.close_notes === 'string' &&
        typeof incident.sys_id === 'string' &&
        typeof incident.number === 'string' &&
        typeof incident['cmdb_ci.sys_id'] === 'string' &&
        typeof incident.sys_created_on === 'string' &&
        typeof incident.caller_id === 'string' &&
        typeof incident.location === 'string' &&
        typeof incident.state === 'string' &&
        typeof incident.category === 'string' &&
        typeof incident.work_notes === 'string' &&
        typeof incident.sys_created_by === 'string' &&
        typeof incident.assigned_to === 'string' &&
        typeof incident.ticket_link === 'string'
    );
}

export function isIssueWithoutKBArray(obj: unknown): obj is IssueWithoutKBArticle[] {
    return Array.isArray(obj) && obj.every(isIssueWithoutKB);
}

function isDuplicateKBArticleMap(obj: unknown): obj is DuplicateKBArticleMap {
    if (typeof obj !== 'object' || obj === null) return false;

    const isDuplicateKBArticleMapstatus = Object.values(obj).every(isKnowledgeArticle);

    return isDuplicateKBArticleMapstatus;
}

function isDuplicateKBCategoryMap(obj: unknown): obj is DuplicateKBCategoryMap {
    if (typeof obj !== 'object' || obj === null) return false;

    const isDuplicateKBCategoryMapstatus = Object.entries(obj).every(([key, value]) => typeof key === 'string' && Array.isArray(value) && value.every(isDuplicateKBArticleMap));

    return isDuplicateKBCategoryMapstatus;
}

export function isDuplicateKBCatalog(obj: unknown): obj is DuplicateKBCatalog {
    const isDuplicateKBCatalogstatus = Array.isArray(obj) && obj.every(isDuplicateKBCategoryMap);
    return isDuplicateKBCatalogstatus;
}

export function isMergedKnowledgeArticleResponse(value: unknown): value is MergedKnowledgeArticleResponse {
    if (typeof value !== 'object' || value === null) return false;

    const v = value as Record<string, unknown>;

    if (typeof v.title !== 'string') return false;
    if (typeof v.merged_article !== 'string') return false;
    if (typeof v.details !== 'object' || v.details === null) return false;

    const details = v.details as Record<string, unknown>;

    return (
        Array.isArray(details.grammar) &&
        details.grammar.every((i) => typeof i === 'string') &&
        Array.isArray(details.overlapping) &&
        details.overlapping.every((i) => typeof i === 'string') &&
        Array.isArray(details.conflicting) &&
        details.conflicting.every((i) => typeof i === 'string') &&
        Array.isArray(details.complementary) &&
        details.complementary.every((i) => typeof i === 'string')
    );
}
