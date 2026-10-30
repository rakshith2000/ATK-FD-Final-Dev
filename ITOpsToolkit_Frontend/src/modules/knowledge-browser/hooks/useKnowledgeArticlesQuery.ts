import { useQuery } from '@tanstack/react-query';
import fetchKnowledgeArticleCountsByCategory from '../services/fetch-knowledge-articles';
import type { CategoryCount } from '@/shared/modules/servicenow/types/knowledge';

export function useKnowledgeArticleCountsByCategoryQuery() {
    const queryKey = ['knowledge-articles-counts-by-category'];

    const query = useQuery<Array<CategoryCount>, Error>({
        queryKey: queryKey,
        queryFn: fetchKnowledgeArticleCountsByCategory,
        retry: false,
        enabled: true,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
