import { useQuery } from '@tanstack/react-query';
import type { KnowledgeArticle } from '../types/knowledge-browser';
import fetchKnowledgeArticlesByCategory from '../services/fetch-knowledge-articles-by-category';

export function useKnowledgeArticlesByCategoryQuery(categorySysId: string | null, isSelected: boolean = false, knowledgeBaseIds: Array<string> = []) {
    const queryKey = ['knowledgeArticlesByCategory', categorySysId, knowledgeBaseIds];

    const query = useQuery<Array<KnowledgeArticle>, Error>({
        queryKey: queryKey,
        queryFn: () => fetchKnowledgeArticlesByCategory(categorySysId, knowledgeBaseIds),
        retry: false,
        enabled: isSelected,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
