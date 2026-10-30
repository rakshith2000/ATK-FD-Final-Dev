import { useQuery } from '@tanstack/react-query';
import fetchUserReadableKnowledgeCategoryCounts from '../services/fetch-user-readable-knowledge-data';
import type { KnowledgeArticlesCatalog, CategoryCount } from '../types/knowledge';

function useAccessibleKnowledgeArticlesCatalogQuery() {
    const queryKey = ['accessible-knowledge-articles-catalog'];

    const query = useQuery({
        queryKey: [...queryKey],
        queryFn: fetchUserReadableKnowledgeCategoryCounts as () => Promise<Array<CategoryCount>>,
        select: (categories: Array<CategoryCount>) => {
            const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
            return {
                articlesCount: totalCount,
                articles: [],
                categories: categories.map((cat) => ({
                    category: cat.categoryName,
                    categoryId: cat.categorySysId,
                    articlesCount: cat.count,
                    articles: [],
                })),
            } as KnowledgeArticlesCatalog;
        },
    });

    return { ...query, queryKey };
}

export default useAccessibleKnowledgeArticlesCatalogQuery;
