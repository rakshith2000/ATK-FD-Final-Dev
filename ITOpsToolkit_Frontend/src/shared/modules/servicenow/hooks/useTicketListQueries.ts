import { useEffect, useMemo, useState, useTransition } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchSnowAssignedTicketsByUserSysId } from '../services/fetch-snow-assigned-tickets-by-user-sys-id';
import { fetchSnowAssignedTicketsByGroupQuery } from '../services/fetch-snow-assigned-tickets-by-group-query';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '../services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';
import { fetchSnowUnassignedTicketsByTicketType } from '../services/fetch-snow-unassigned-tickets-by-ticket-type';
import type { SnowTicket, SnowTicketAssignmentFilterType, SnowTableName } from '../types/ticket';
import getTicketFieldText from '../utils/get-ticket-field-text';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { useTicketFieldChoiceQuery } from './useTicketFieldChoiceQuery';

interface UseTicketListQueriesParams {
    ticketTypeFilter: SnowTableName;
    ticketAssignmentFilter: SnowTicketAssignmentFilterType;
    ticketSearchValue: string;
    ticketStateFilter: string | null;
}

export function useTicketListQueries({ ticketTypeFilter, ticketAssignmentFilter, ticketSearchValue, ticketStateFilter }: UseTicketListQueriesParams) {
    const { getUserSnowDetails } = useAuth();

    const [isSearchFilterPending, startSearchFilterTransition] = useTransition();

    const [filteredTickets, setFilteredTickets] = useState<SnowTicket[]>([]);

    const ticketsAssignedToUserKey = ['assigned-to-user', ticketTypeFilter];
    const ticketsAssignedToGroupsKey = ['assignemnt-group', ticketTypeFilter];
    const ticketsUnassignedKey = ['unassigned', ticketTypeFilter];

    const ticketsAssignedToUserQuery = useQuery({
        queryKey: ticketsAssignedToUserKey,
        queryFn: fetchSnowAssignedTicketsByUserSysId.bind(null, { ticketType: ticketTypeFilter }),
        enabled: ticketAssignmentFilter === 'assigned-to-user',
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const ticketsAssignedToGroupsQuery = useQuery({
        queryKey: ticketsAssignedToGroupsKey,
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();
            const userMemberOfAssignmentGroups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
            return fetchSnowAssignedTicketsByGroupQuery({ ticketType: ticketTypeFilter, groupQuery: userMemberOfAssignmentGroups?.map((group) => group.value).join('%5E') ?? '' });
        },
        enabled: ticketAssignmentFilter === 'assignemnt-group',
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const ticketsUnassignedQuery = useQuery({
        queryKey: ticketsUnassignedKey,
        queryFn: fetchSnowUnassignedTicketsByTicketType.bind(null, { ticketType: ticketTypeFilter }),
        enabled: ticketAssignmentFilter === 'unassigned',
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const ticketStateChoiceQuery = useTicketFieldChoiceQuery(ticketTypeFilter, 'state');

    const activeFiltersTicketsQuery = useMemo(() => {
        switch (ticketAssignmentFilter) {
            case 'assigned-to-user':
                return ticketsAssignedToUserQuery;
            case 'assignemnt-group':
                return ticketsAssignedToGroupsQuery;
            case 'unassigned':
                return ticketsUnassignedQuery;
        }
    }, [ticketAssignmentFilter, ticketsAssignedToUserQuery, ticketsAssignedToGroupsQuery, ticketsUnassignedQuery]);

    useEffect(() => {
        const data = activeFiltersTicketsQuery?.data ?? [];

        startSearchFilterTransition(async () => {
            let result = data;

            if (ticketStateFilter) {
                result = result.filter((ticket) => (ticket as SnowTicket).state?.value === ticketStateFilter);
            }

            if (ticketSearchValue.trim()) {
                const lower = ticketSearchValue.toLowerCase();
                result = result.filter((ticket) => {
                    const t = ticket as SnowTicket;
                    return (
                        getTicketFieldText(t.number).includes(lower) ||
                        getTicketFieldText(t.short_description).includes(lower) ||
                        getTicketFieldText(t.state).includes(lower) ||
                        getTicketFieldText(t.assigned_to).includes(lower) ||
                        getTicketFieldText(t.priority).includes(lower) ||
                        getTicketFieldText(t.assignment_group).includes(lower)
                    );
                });
            }

            setFilteredTickets(result);
        });
    }, [activeFiltersTicketsQuery.data, ticketSearchValue, ticketStateFilter]);

    const activeFiltersQueryKey = useMemo(() => {
        switch (ticketAssignmentFilter) {
            case 'assigned-to-user':
                return ticketsAssignedToUserKey;
            case 'assignemnt-group':
                return ticketsAssignedToGroupsKey;
            case 'unassigned':
                return ticketsUnassignedKey;
        }
    }, [ticketAssignmentFilter]);

    return {
        activeFiltersTicketsQuery: {
            ...activeFiltersTicketsQuery,
            isLoading: activeFiltersTicketsQuery.isLoading || isSearchFilterPending,
            isFetching: activeFiltersTicketsQuery.isFetching || isSearchFilterPending,
            queryKey: activeFiltersQueryKey,
        } as UseQueryResult<SnowTicket[], Error> & { queryKey: (string | SnowTableName)[] | undefined },
        filteredTickets,
        ticketStateChoiceQuery,
        ticketsAssignedToUserQuery: { ...ticketsAssignedToUserQuery, queryKey: ticketsAssignedToUserKey },
        ticketsAssignedToGroupsQuery: { ...ticketsAssignedToGroupsQuery, queryKey: ticketsAssignedToGroupsKey },
        ticketsUnassignedQuery: { ...ticketsUnassignedQuery, queryKey: ticketsUnassignedKey },
    };
}
