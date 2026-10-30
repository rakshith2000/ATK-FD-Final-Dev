import type { QueryClient } from '@tanstack/react-query';

export const updateQueriesData = <T>(
    queryClient: QueryClient,
    {
        queryKeyFilter,
        updater,
    }: {
        queryKeyFilter: (queryKey: readonly unknown[]) => boolean; // ← readonly
        updater: (prev: T | undefined) => T | undefined;
    },
): void => {
    queryClient.setQueriesData<T>({ predicate: (query) => queryKeyFilter(query.queryKey) }, updater);
};
