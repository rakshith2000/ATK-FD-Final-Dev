/** A ServiceNow display-value field, e.g. `{ display_value, value }`. Either may be `null` for empty fields. */
export interface SnowDisplayField {
    display_value: string | null;
    value: string | null;
}

/** A ServiceNow reference field that may also carry a `link` to the referenced record. */
export interface SnowReferenceField extends SnowDisplayField {
    link?: string;
}

/**
 * A `user_criteria` record referencing the current user.
 *
 * Queried with `sysparm_display_value=true`, so fields arrive as flat strings
 * (not `{ display_value, value }` objects). We only need the record `sys_id`.
 */
export interface SnowUserCriteriaRecord {
    sys_id: string;
    name?: string;
}

/**
 * A `kb_uc_can_read_mtom` mapping record linking a `user_criteria` to a knowledge base.
 *
 * Queried with `sysparm_display_value=all`, so both fields arrive as reference fields.
 * We key off `kb_knowledge_base.value` (the knowledge-base sys_id).
 */
export interface SnowKbReadAccessRecord {
    kb_knowledge_base: SnowReferenceField;
    user_criteria: SnowReferenceField;
}

/** A single knowledge article record as returned by the knowledge-browser API. */
export interface KnowledgeArticle {
    sys_id: SnowDisplayField;
    number: SnowDisplayField;
    short_description: SnowDisplayField;
    kb_knowledge_base: SnowReferenceField;
    sys_created_on: SnowDisplayField;
    author: SnowReferenceField;
    rating: SnowDisplayField;
    workflow_state: SnowDisplayField;
    text: SnowDisplayField;
    kb_category: SnowReferenceField;
}

/** Articles grouped under a single knowledge-base category. */
export interface KnowledgeCategoryGroup {
    /** The category display name, e.g. "Cloud". */
    category: string;
    /** The category record `value` (sys_id), stable across renames. */
    categoryId: string;
    articlesCount: number;
    articles: KnowledgeArticle[];
}

/** The full catalog derived from the article list, grouped by category. */
export interface KnowledgeBrowserCatalog {
    articlesCount: number;
    articles: KnowledgeArticle[];
    categories: KnowledgeCategoryGroup[];
}
