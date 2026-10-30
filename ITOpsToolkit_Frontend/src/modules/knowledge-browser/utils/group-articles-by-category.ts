import type { KnowledgeArticle, KnowledgeBrowserCatalog, KnowledgeCategoryGroup } from '../types/knowledge-browser';

const UNCATEGORISED = 'Uncategorised';

/**
 * Groups a flat list of knowledge articles into unique categories.
 * Categories are keyed by their display name and sorted alphabetically.
 */
function groupArticlesByCategory(articles: KnowledgeArticle[]): KnowledgeBrowserCatalog {
    const groupsByCategory = new Map<string, KnowledgeCategoryGroup>();

    for (const article of articles) {
        const category = article.kb_category?.display_value?.trim() || UNCATEGORISED;
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

export default groupArticlesByCategory;
