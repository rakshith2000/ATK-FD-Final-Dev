import type { CategoryKBAnalytics, KBCatalogAnalytics, KnowledgeArticle_From_List_API } from '../types';

function isLowScoring(article: KnowledgeArticle_From_List_API): boolean {
    const rating = parseFloat(article.rating.value);
    const aiScore = article?.ai_score ? parseFloat(String(article?.ai_score)) : NaN;
    return (!isNaN(rating) && rating < 3) || aiScore < 3;
}

function getCategories(articles: KnowledgeArticle_From_List_API[]): string[] {
    return [...new Set(articles.map((article) => article.kb_category.display_value))];
}

function getArticlesByCategory(articles: KnowledgeArticle_From_List_API[], category: string): KnowledgeArticle_From_List_API[] {
    return articles.filter((article) => article.kb_category.display_value === category);
}

function getLowScoringArticlesByCategory(articles: KnowledgeArticle_From_List_API[], category: string): KnowledgeArticle_From_List_API[] {
    return articles.filter((article) => article.kb_category.display_value === category && isLowScoring(article));
}

function getKBArticleCountByCategory(articles: KnowledgeArticle_From_List_API[]): CategoryKBAnalytics[] {
    return getCategories(articles).map((category) => {
        const categoryArticles = getArticlesByCategory(articles, category);
        const lowScoringArticles = getLowScoringArticlesByCategory(articles, category);

        return {
            category,
            articlesCount: categoryArticles.length,
            articles: categoryArticles,
            lowScoringArticlesCount: lowScoringArticles.length,
            lowScoringArticles,
        };
    });
}

function getKBArticleAnalytics(articles: KnowledgeArticle_From_List_API[]): KBCatalogAnalytics {
    const byCategory = getKBArticleCountByCategory(articles);

    return {
        articlesCount: articles.length,
        articles,
        lowScoringArticlesCount: byCategory.reduce((sum, cat) => sum + cat.lowScoringArticlesCount, 0),
        lowScoringArticles: byCategory.reduce<KnowledgeArticle_From_List_API[]>((arr, cat) => arr.concat(cat.lowScoringArticles), []),
        byCategory,
    };
}
export default getKBArticleAnalytics;
