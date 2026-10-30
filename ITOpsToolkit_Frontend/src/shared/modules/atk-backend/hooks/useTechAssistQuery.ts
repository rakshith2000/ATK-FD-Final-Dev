import { useQuery } from '@tanstack/react-query';
import listRelevantArticles, { type ListRelevantArticlesResponse } from '../services/list-relevant-articles';

interface UseTechAssistQueryParams {
    selectedTicketId: string | null;
    selectedTicketDetails: Record<string, unknown> | undefined;
    enabled: boolean;
}

export function useTechAssistQuery({ selectedTicketId, selectedTicketDetails, enabled }: UseTechAssistQueryParams) {
    const queryKey = ['techAssistContext', selectedTicketId];
    const query = useQuery<ListRelevantArticlesResponse, Error>({
        queryKey: queryKey,
        queryFn: listRelevantArticles.bind(null, {
            incident_details: selectedTicketDetails ?? {},
        }),
        enabled: enabled && !!selectedTicketId,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
