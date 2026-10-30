import type { SnowFieldWithReferenceLink, SnowFieldWithValueAndDisplayText } from '.';

export interface KnowledgeArticle {
    sys_id: SnowFieldWithValueAndDisplayText;
    number: SnowFieldWithValueAndDisplayText;
    short_description: SnowFieldWithValueAndDisplayText;
    kb_knowledge_base: SnowFieldWithReferenceLink;
    sys_created_on: SnowFieldWithValueAndDisplayText;
    author: SnowFieldWithReferenceLink;
    rating: SnowFieldWithValueAndDisplayText;
    workflow_state: SnowFieldWithValueAndDisplayText;
    text: SnowFieldWithValueAndDisplayText;
    kb_category: SnowFieldWithReferenceLink;
}

export interface KnowledgeArticlesCategoryGroup {
    category: string;
    categoryId: string;
    articlesCount: number;
    articles: Array<KnowledgeArticle>;
}

export interface KnowledgeArticlesCatalog {
    articlesCount: number;
    articles: Array<KnowledgeArticle>;
    categories: Array<KnowledgeArticlesCategoryGroup>;
}

export interface CreateKnowledgeArticleResposne {
    number: KBNumber;
    sys_id: string;
}

export interface CreateKnowledgeArticleRequest {
    kb_category: KBCategory;
    kb_knowledge_base: string;
    short_description: string;
    text: string;
    author: string;
    workflow_state: string;
}

export interface UpdateKnowledgeArticleRequest {
    kb_category: KBCategory;
    kb_knowledge_base: string;
    short_description: string;
    text: string;
    author: string;
    workflow_state: string;
    number: string;
}

export type UpdateKnowledgeArticleResposne = {
    number: KBNumber;
    sys_id: string;
};

export interface CategoryCount {
    categorySysId: string | null;
    categoryId: string | null;
    categoryName: string;
    count: number;
}

export interface GroupByField {
    value?: string;
    display_value?: string;
}

export interface StatsInfo {
    count?: string | number;
}

export interface ArticleCountItem {
    groupby_fields?: Array<GroupByField>;
    stats?: StatsInfo;
}
