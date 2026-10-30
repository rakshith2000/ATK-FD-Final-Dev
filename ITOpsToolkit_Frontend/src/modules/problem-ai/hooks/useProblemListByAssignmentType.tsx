import type { SnowTicket, SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchProblemsByAssignmentType } from '../services/fetch-problem-list-by-assignment-type';

const useProblemListByAssignmentType = ({
    assignmentType,
    searchTerm,
    limit,
    groupQuery,
}: {
    assignmentType: SnowTicketAssignmentFilterType;
    searchTerm: string;
    limit: number;
    groupQuery?: string;
}) => {
    const queryKey = ['problem-list', assignmentType, searchTerm, limit, groupQuery];
    const query = useInfiniteQuery<Array<SnowTicket>, Error>({
        queryKey: [...queryKey],
        queryFn: ({ pageParam }) =>
            fetchProblemsByAssignmentType({
                assignmentType: assignmentType,
                searchValue: searchTerm,
                groupQuery: groupQuery,
                limit: limit,
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

export default useProblemListByAssignmentType;
