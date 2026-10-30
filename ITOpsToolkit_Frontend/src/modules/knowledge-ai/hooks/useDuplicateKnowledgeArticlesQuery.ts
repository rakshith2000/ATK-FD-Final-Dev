import { useQuery } from '@tanstack/react-query';
import fetchDuplicateKnowledgeArticles from '../services/fetch-duplicate-knowledge-articles';
import type { DuplicateKBCatalog, DuplicateKBCatalogAnalytics } from '../types';
import getDuplicateKBCatalogAnalytics from '../utils/duplicate-kb-articles-analysis';

export function useDuplicateKnowledgeArticlesQuery() {
    const queryKey = ['duplicateKnowledgeArticlesQuery'];

    const query = useQuery<DuplicateKBCatalog, Error, DuplicateKBCatalogAnalytics>({
        queryKey: queryKey,
        queryFn: fetchDuplicateKnowledgeArticles,
        retry: false,
        enabled: true,
        staleTime: 5 * 60 * 1000,
        select: (catalog) => getDuplicateKBCatalogAnalytics(catalog),
    });

    return { ...query, queryKey };
}
