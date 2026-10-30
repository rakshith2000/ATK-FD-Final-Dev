import type { SnowDisplayField, SnowReferenceField, SnowUserCriteriaRecord, SnowKbReadAccessRecord, KnowledgeArticle } from '../types/knowledge-browser';

function isStringOrNull(value: unknown): value is string | null {
    return typeof value === 'string' || value === null;
}

export function isSnowDisplayField(obj: unknown): obj is SnowDisplayField {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'display_value' in obj &&
        'value' in obj &&
        isStringOrNull((obj as SnowDisplayField).display_value) &&
        isStringOrNull((obj as SnowDisplayField).value)
    );
}

export function isSnowReferenceField(obj: unknown): obj is SnowReferenceField {
    // `link` is optional on reference fields — ServiceNow omits it when the reference is empty
    // (e.g. an article with no author), so we only require the base display-field shape here.
    return isSnowDisplayField(obj) && (!('link' in obj) || typeof (obj as SnowReferenceField).link === 'string');
}

export function isSnowUserCriteriaRecord(obj: unknown): obj is SnowUserCriteriaRecord {
    if (typeof obj !== 'object' || obj === null) return false;
    const record = obj as Record<string, unknown>;
    // `sysparm_display_value=true` returns flat strings; `sys_id` is the only field we rely on.
    return typeof record.sys_id === 'string' && (record.name === undefined || typeof record.name === 'string');
}

export function isSnowUserCriteriaArray(obj: unknown): obj is SnowUserCriteriaRecord[] {
    return Array.isArray(obj) && obj.every(isSnowUserCriteriaRecord);
}

export function isSnowKbReadAccessRecord(obj: unknown): obj is SnowKbReadAccessRecord {
    if (typeof obj !== 'object' || obj === null) return false;
    const record = obj as Record<string, unknown>;
    // `sysparm_display_value=all` returns both fields as reference fields.
    return isSnowReferenceField(record.kb_knowledge_base) && isSnowReferenceField(record.user_criteria);
}

export function isSnowKbReadAccessArray(obj: unknown): obj is SnowKbReadAccessRecord[] {
    return Array.isArray(obj) && obj.every(isSnowKbReadAccessRecord);
}

export function isKnowledgeArticle(obj: unknown): obj is KnowledgeArticle {
    if (typeof obj !== 'object' || obj === null) return false;

    const record = obj as Record<string, unknown>;

    // Every field (display and reference alike) satisfies the base display-field shape.
    // We validate against that and treat `link` as optional metadata on reference fields.
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

    return requiredFields.every((field) => isSnowDisplayField(record[field]));
}

export function isKnowledgeArticleArray(obj: unknown): obj is KnowledgeArticle[] {
    return Array.isArray(obj) && obj.every(isKnowledgeArticle);
}
