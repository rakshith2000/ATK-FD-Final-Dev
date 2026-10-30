import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchSnowTicketJournalEntriesBySysId, type TicketJournalEntry } from '@/shared/modules/servicenow/services/fetch-snow-ticket-journal-entries-by-sys-id';
import { fetchSnowTicketAuditEntriesBySysId, type TicketAuditEntry } from '@/shared/modules/servicenow/services/fetch-snow-ticket-audit-entries-by-sys-id';
import type { SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';

interface UseServiceRequestTicketFormQueriesParams {
    ticketType: SnowTableName;
    ticketId: string;
    shouldLoadJournalEntries: boolean;
    enableAuditEntries?: boolean;
}

export type UnifiedHistoryEntry = (TicketJournalEntry & { type: 'journal' }) | (TicketAuditEntry & { type: 'audit' });

/**
 * Service-request-local mirror of the shared `useTicketFormQueries`.
 *
 * Identical journal/audit behaviour (reuses the shared services), but sources
 * state choices from the module-local `useTicketRequestStateChoiceQuery`
 * (`element=request_state`) instead of the shared `useTicketStateChoiceQuery`
 * (`element=state`). This keeps Service Request off the shared state-choice API.
 */
export function useServiceRequestTicketFormQueries({ ticketType, ticketId, shouldLoadJournalEntries, enableAuditEntries = true }: UseServiceRequestTicketFormQueriesParams) {
    const ticketStateChoiceQuery = useTicketFieldChoiceQuery(ticketType, 'request_state');

    const limit = 10;
    const ticketJournalEntriesQueryKey = ['ticketJournalEntries', ticketId];
    const ticketJournalEntries = useInfiniteQuery<Array<TicketJournalEntry>, Error>({
        queryKey: [...ticketJournalEntriesQueryKey],
        queryFn: ({ pageParam = 0 }) =>
            fetchSnowTicketJournalEntriesBySysId({
                ticketId: ticketId ?? '',
                limit,
                offset: pageParam as number,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < limit) return undefined;
            return allPages.length * limit;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!ticketId && shouldLoadJournalEntries,
    });

    const ticketAuditEntriesQueryKey = ['ticketAuditEntries', ticketId];
    const ticketAuditEntries = useInfiniteQuery<Array<TicketAuditEntry>, Error>({
        queryKey: [...ticketAuditEntriesQueryKey],
        queryFn: ({ pageParam = 0 }) =>
            fetchSnowTicketAuditEntriesBySysId({
                ticketId: ticketId ?? '',
                limit,
                offset: pageParam as number,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < limit) return undefined;
            return allPages.length * limit;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!ticketId && shouldLoadJournalEntries && !!enableAuditEntries,
    });

    const journalList = ticketJournalEntries.data?.pages.flat() ?? [];
    const auditList = enableAuditEntries ? (ticketAuditEntries.data?.pages.flat() ?? []) : [];

    const unifiedJournalList = journalList.map((entry) => ({
        ...entry,
        type: 'journal' as const,
    }));
    const unifiedAuditList = auditList.map((entry) => ({
        ...entry,
        type: 'audit' as const,
    }));

    const journalEntriesList: Array<UnifiedHistoryEntry> = [...unifiedJournalList, ...unifiedAuditList].sort((a, b) => {
        return new Date(b.sys_created_on + ' UTC').getTime() - new Date(a.sys_created_on + ' UTC').getTime();
    });

    const isLoading = ticketStateChoiceQuery.isLoading || (shouldLoadJournalEntries && (ticketJournalEntries.isLoading || (enableAuditEntries && ticketAuditEntries.isLoading)));

    const isError = ticketStateChoiceQuery.isError || (shouldLoadJournalEntries && (ticketJournalEntries.isError || (enableAuditEntries && ticketAuditEntries.isError)));

    const error = ticketStateChoiceQuery.error ?? (shouldLoadJournalEntries ? (ticketJournalEntries.error ?? (enableAuditEntries ? ticketAuditEntries.error : null)) : null);

    const refetch = async () => {
        const promises: Array<Promise<unknown>> = [ticketJournalEntries.refetch()];
        if (enableAuditEntries) {
            promises.push(ticketAuditEntries.refetch());
        }
        await Promise.all(promises);
    };

    const fetchNextPage = async () => {
        const promises: Array<Promise<unknown>> = [];
        if (ticketJournalEntries.hasNextPage) {
            promises.push(ticketJournalEntries.fetchNextPage());
        }
        if (enableAuditEntries && ticketAuditEntries.hasNextPage) {
            promises.push(ticketAuditEntries.fetchNextPage());
        }
        await Promise.all(promises);
    };

    const hasNextPage = !!(ticketJournalEntries.hasNextPage || (enableAuditEntries && ticketAuditEntries.hasNextPage));
    const isFetchingNextPage = !!(ticketJournalEntries.isFetchingNextPage || (enableAuditEntries && ticketAuditEntries.isFetchingNextPage));

    const handleRetry = () => {
        if (ticketStateChoiceQuery.isError) ticketStateChoiceQuery.refetch();
        if (shouldLoadJournalEntries) {
            if (ticketJournalEntries.isError) ticketJournalEntries.refetch();
            if (enableAuditEntries && ticketAuditEntries.isError) ticketAuditEntries.refetch();
        }
    };

    return {
        ticketStateChoiceQuery,
        ticketJournalEntries: {
            isLoading: ticketJournalEntries.isLoading || (enableAuditEntries && ticketAuditEntries.isLoading),
            isError: ticketJournalEntries.isError || (enableAuditEntries && ticketAuditEntries.isError),
            error: ticketJournalEntries.error ?? (enableAuditEntries ? ticketAuditEntries.error : null),
            hasNextPage,
            isFetchingNextPage,
            fetchNextPage,
            refetch,
            ticketJournalEntriesQueryKey,
        },
        journalEntriesList,
        isLoading,
        isError,
        error,
        handleRetry,
    };
}
