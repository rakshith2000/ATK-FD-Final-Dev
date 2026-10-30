import { useQuery } from '@tanstack/react-query';
import fetchRecentKbArticles from '../services/fetch-recent-kb-articles';
import type { RecentKBArticle } from '../types';

export function useRecentKbArticlesQuery() {
    const queryKey = ['recentKbArticlesQuery'];

    const query = useQuery<Array<RecentKBArticle>, Error>({
        queryKey: queryKey,
        queryFn: fetchRecentKbArticles,
        retry: false,
        enabled: true,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
