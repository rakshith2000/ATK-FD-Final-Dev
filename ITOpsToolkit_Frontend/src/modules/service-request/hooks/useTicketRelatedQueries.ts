import { useQuery } from '@tanstack/react-query';
import { fetchSnowUserRelatedRequestsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-related-requests-by-user-sys-id';
import { fetchSnowRelatedRequestsByShortDescription } from '@/shared/modules/servicenow/services/fetch-snow-related-requests-by-short-description';

interface UseTicketRelatedQueriesParams {
    selectedTicketId: string | null;
    requestedForValue: string | null | undefined;
    shortDescription: string | null | undefined;
}

export function useTicketRelatedQueries({ selectedTicketId, requestedForValue, shortDescription }: UseTicketRelatedQueriesParams) {
    const userRelatedRequestsKey = ['userRelatedRequests', selectedTicketId, requestedForValue];
    const relatedRequestsKey = ['relatedRequests', selectedTicketId, shortDescription];

    const userRelatedRequests = useQuery({
        queryKey: userRelatedRequestsKey,
        queryFn: fetchSnowUserRelatedRequestsByUserSysId.bind(null, { userSysId: requestedForValue, currentTicketSysId: selectedTicketId }),
        enabled: !!selectedTicketId && !!requestedForValue,
        staleTime: 5 * 60 * 1000,
    });

    const relatedRequests = useQuery({
        queryKey: relatedRequestsKey,
        queryFn: fetchSnowRelatedRequestsByShortDescription.bind(null, { keyword: shortDescription, currentTicketSysId: selectedTicketId }),
        enabled: !!selectedTicketId && !!shortDescription,
        staleTime: 5 * 60 * 1000,
    });

    return {
        userRelatedRequests: { ...userRelatedRequests, queryKey: userRelatedRequestsKey },
        relatedRequests: { ...relatedRequests, queryKey: relatedRequestsKey },
    };
}
