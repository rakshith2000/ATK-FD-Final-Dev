import type { KnowledgeArticle, KnowledgeArticlesCatalog, KnowledgeArticlesCategoryGroup } from '../types/knowledge';

const IF_CATEGORY_DISPLAY_VALUE_IS_EMPTY = 'Others';

function makeKnowledgeArticleCatalogFromFlatArray(articles: KnowledgeArticle[]): KnowledgeArticlesCatalog {
    const groupsByCategory = new Map<string, KnowledgeArticlesCategoryGroup>();

    for (const article of articles) {
        const category = article.kb_category?.display_value?.trim() || IF_CATEGORY_DISPLAY_VALUE_IS_EMPTY;
        const categoryId = article.kb_category?.value?.trim() || category;

        const existing = groupsByCategory.get(category);
        if (existing) {
            existing.articles.push(article);
            existing.articlesCount += 1;
        } else {
            groupsByCategory.set(category, {
                category,
                categoryId,
                articlesCount: 1,
                articles: [article],
            });
        }
    }

    const categories = [...groupsByCategory.values()].sort((a, b) => a.category.localeCompare(b.category));

    return {
        articlesCount: articles.length,
        articles,
        categories,
    };
}

export default makeKnowledgeArticleCatalogFromFlatArray;
