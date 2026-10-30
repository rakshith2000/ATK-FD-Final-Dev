import { useEffect, useState, useTransition } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import fetchProblemTickets from '../services/fetch-problem-tickets';
import filterProblemTickets from '../utils/filter-problem-tickets';
import type { ListProblemTicketsResponse, ProblemTicket } from '../types/problem-ai';
import type { ProblemStatusFilter } from '../constants/problem-status-filter-options';

export const problemTicketsQueryKey = ['problemTickets'] as const;

interface UseProblemTicketsQueryParams {
    status: ProblemStatusFilter;
    search: string;
}

export function useProblemTicketsQuery({ status, search }: UseProblemTicketsQueryParams) {
    const [isFilterPending, startFilterTransition] = useTransition();
    const [filteredTickets, setFilteredTickets] = useState<ProblemTicket[]>([]);

    const queryKey = [...problemTicketsQueryKey, 'all'];
    const query = useQuery<ListProblemTicketsResponse, Error>({
        queryKey: [...queryKey],
        queryFn: () => fetchProblemTickets({ status: 'all' }),
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        const tickets = query.data ?? [];
        startFilterTransition(() => {
            setFilteredTickets(filterProblemTickets({ tickets, status, search }));
        });
    }, [query.data, status, search]);

    return {
        ...query,
        isLoading: query.isLoading || isFilterPending,
        isFetching: query.isFetching || isFilterPending,
        queryKey,
        filteredTickets,
    } as UseQueryResult<ProblemTicket[], Error> & { queryKey: typeof queryKey; filteredTickets: ProblemTicket[] };
}
