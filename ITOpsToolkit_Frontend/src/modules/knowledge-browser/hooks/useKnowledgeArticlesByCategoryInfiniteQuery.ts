import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchKbArticlesByCategory } from '@/shared/modules/servicenow/services/fetch-knowledge-articles-by-knowledge-base-ids';
import type { KnowledgeArticle } from '@/shared/modules/servicenow/types/knowledge';

const LIMIT = 10;

export function useKnowledgeArticlesByCategoryInfiniteQuery(categorySysId: string | null, enabled: boolean = true, knowledgeBaseIds: Array<string> = []) {
    // Only include knowledgeBaseIds in query key if it's for Uncategorised (categorySysId === null)
    // For regular categories, knowledgeBaseIds is not used in the API query
    const queryKey = ['kb-articles-by-category', categorySysId, ...(categorySysId === null ? [JSON.stringify(knowledgeBaseIds)] : [])];

    const query = useInfiniteQuery<Array<KnowledgeArticle>, Error>({
        queryKey: queryKey,
        queryFn: ({ pageParam }) =>
            fetchKbArticlesByCategory({
                categorySysId: categorySysId ?? '',
                limit: LIMIT,
                offset: (pageParam as number) * LIMIT,
                knowledgeBaseIds: knowledgeBaseIds,
            }),
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < LIMIT) return undefined;
            return allPages.length;
        },
        initialPageParam: 0,
        retry: 0,
        enabled: enabled && categorySysId !== undefined,
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });

    return { ...query, queryKey, LIMIT };
}
