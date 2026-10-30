import type { SnowTicket, SnowTicketAssignmentFilterType, SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTicketsByAssignmentType } from '../services/fetch-tickets-list-by-assignment-type';

/**
 * Infinite (offset-paginated) ticket list for Service Request, mirroring Incident
 * AI's `useIncidentListByAssignmentType`. Applies to the assigned-to-user,
 * assignment-group and unassigned views and is scoped by `ticketType`.
 */
const useTicketListByAssignmentType = ({
    ticketType,
    assignmentType,
    searchTerm,
    limit,
    groupQuery,
}: {
    ticketType: SnowTableName;
    assignmentType: SnowTicketAssignmentFilterType;
    searchTerm: string;
    limit: number;
    groupQuery?: string;
}) => {
    const queryKey = ['service-request-ticket-list', ticketType, assignmentType, searchTerm, limit, groupQuery];
    const query = useInfiniteQuery<Array<SnowTicket>, Error>({
        queryKey: [...queryKey],
        queryFn: ({ pageParam }) =>
            fetchTicketsByAssignmentType({
                ticketType,
                assignmentType,
                searchValue: searchTerm,
                groupQuery,
                limit,
                offset: pageParam as number,
            }),
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < limit) return undefined;
            return allPages.length * limit;
        },
        initialPageParam: 0,
        retry: 2,
        enabled: assignmentType !== 'assignemnt-group' || (assignmentType === 'assignemnt-group' && typeof groupQuery === 'string'),
        staleTime: 0,
        gcTime: 0,
    });

    return { ...query, queryKey };
};

export default useTicketListByAssignmentType;
