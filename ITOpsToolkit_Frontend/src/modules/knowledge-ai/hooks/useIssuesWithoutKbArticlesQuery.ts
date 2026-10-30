import { useQuery } from '@tanstack/react-query';
import fetchIssuesWithoutKbArticles from '../services/fetch-issues-without-kb-articles';

export function useIssuesWithoutKbArticlesQuery() {
    const queryKey = ['issuesWithoutKbArticlesQuery'];
    const query = useQuery({
        queryKey: queryKey,
        queryFn: fetchIssuesWithoutKbArticles,
        retry: false,
        enabled: true,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
