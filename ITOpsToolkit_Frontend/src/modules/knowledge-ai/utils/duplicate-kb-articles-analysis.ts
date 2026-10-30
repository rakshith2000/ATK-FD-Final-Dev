import type {
    CategoryWiseDuplicateCatalog,
    DuplicateGroup,
    DuplicateKBArticleMap,
    DuplicateKBCatalog,
    DuplicateKBCatalogAnalytics,
    DuplicateKBCategoryMap,
    KBCategory,
    KnowledgeArticle,
} from '../types';

function getArticlesByCategory(catalog: DuplicateKBCatalog, category: KBCategory): KnowledgeArticle[] {
    return catalog
        .flatMap((categoryMap: DuplicateKBCategoryMap) => Object.entries(categoryMap))
        .filter(([cat]: [string, DuplicateKBArticleMap[]]) => (cat?.trim() || 'Others') === category)
        .flatMap(([, articleMaps]: [string, DuplicateKBArticleMap[]]) => articleMaps.flatMap((articleMap: DuplicateKBArticleMap) => Object.values(articleMap)));
}

function getCategories(catalog: DuplicateKBCatalog): KBCategory[] {
    return [...new Set<string>(catalog.flatMap((categoryMap: DuplicateKBCategoryMap) => Object.keys(categoryMap)).map((cat: string) => cat?.trim() || 'Others'))];
}

function getDuplicateGroupsByCategory(catalog: DuplicateKBCatalog, category: KBCategory): DuplicateGroup[] {
    return catalog
        .flatMap((categoryMap: DuplicateKBCategoryMap) => Object.entries(categoryMap))
        .filter(([cat]: [string, DuplicateKBArticleMap[]]) => (cat?.trim() || 'Others') === category)
        .flatMap(([, articleMaps]: [string, DuplicateKBArticleMap[]]) => articleMaps)
        .filter((articleMap: DuplicateKBArticleMap) => Object.keys(articleMap).length > 1)
        .map((articleMap: DuplicateKBArticleMap, index: number) => ({
            groupIndex: index,
            category: category,
            knowledgeBase: (Object.values(articleMap) as KnowledgeArticle[]).find((a) => a?.kb_metadata?.kb_knowledge_base)?.kb_metadata?.kb_knowledge_base ?? '',
            articlesCount: Object.entries(articleMap).length,
            kbNumbers: Object.keys(articleMap),
            articles: Object.values(articleMap) as KnowledgeArticle[],
        }));
}

function getDuplicateCountByCategory(catalog: DuplicateKBCatalog): CategoryWiseDuplicateCatalog[] {
    return getCategories(catalog).map((category) => {
        const duplicateGroups = getDuplicateGroupsByCategory(catalog, category);
        const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.articles.length, 0);

        return {
            category,
            articlesCount: getArticlesByCategory(catalog, category).length,
            duplicateArticlesCount: duplicateCount,
            duplicateGroups,
        };
    });
}

export default function getDuplicateKBCatalogAnalytics(catalog: DuplicateKBCatalog): DuplicateKBCatalogAnalytics {
    const byCategory = getDuplicateCountByCategory(catalog);

    return {
        categoriesCount: byCategory.length,
        articlesCount: byCategory.reduce((sum, cat) => sum + cat.articlesCount, 0),
        duplicateGroupsCount: byCategory.reduce((sum, cat) => sum + cat.duplicateGroups.length, 0),
        duplicateArticlesCount: byCategory.reduce((sum, cat) => sum + cat.duplicateArticlesCount, 0),
        byCategory,
    };
}
