import type { mergedKnowledgeArticleResponseSchema } from '../schema/merged-knowledge-article-response.schema ';
import type { duplicateKBCatalogSchema, knowledgeArticleSchema } from '../schema/duplicate-kb-catalog.schema';
import type { displayValueSchema, knowledgeArticleFromListApiSchema } from '../schema/knowledge-article-from-list-api.schema';
import type { recentKBArticleSchema } from '../schema/recent-kb-article.schema';

export type KnowledgeArticle = z.infer<typeof knowledgeArticleSchema>;

export type DisplayValue = z.infer<typeof displayValueSchema>;

export type KnowledgeArticle_From_List_API = z.infer<typeof knowledgeArticleFromListApiSchema>;

export interface CategoryKBAnalytics {
    category: KBCategory;
    articlesCount: number;
    articles: KnowledgeArticle_From_List_API[];
    lowScoringArticlesCount: number;
    lowScoringArticles: KnowledgeArticle_From_List_API[];
}

export interface KBCatalogAnalytics {
    articlesCount: number;
    articles: KnowledgeArticle_From_List_API[];
    lowScoringArticlesCount: number;
    lowScoringArticles: KnowledgeArticle_From_List_API[];
    byCategory: CategoryKBAnalytics[];
}

export type RecentKBArticle = z.infer<typeof recentKBArticleSchema>;

// Duplicate KB
export type KBNumber = string;

export type KBCategory = string;

export type DuplicateKBCatalog = z.infer<typeof duplicateKBCatalogSchema>;

export type DuplicateKBCategoryMap = DuplicateKBCatalog[number];

export type DuplicateKBArticleMap = DuplicateKBCategoryMap[string][number];

export interface CategoryWiseDuplicateCatalog {
    category: KBCategory;
    articlesCount: number;
    duplicateArticlesCount: number;
    duplicateGroups: DuplicateGroup[];
}

export interface DuplicateGroup {
    groupIndex: number;
    articlesCount: number;
    category: string;
    knowledgeBase: string;
    articles: KnowledgeArticle[];
    kbNumbers: KBNumber[];
}

export interface DuplicateKBCatalogAnalytics {
    categoriesCount: number;
    articlesCount: number;
    duplicateGroupsCount: number;
    duplicateArticlesCount: number;
    byCategory: CategoryWiseDuplicateCatalog[];
}

export type MergedKnowledgeArticleResponse = z.infer<typeof mergedKnowledgeArticleResponseSchema>;
