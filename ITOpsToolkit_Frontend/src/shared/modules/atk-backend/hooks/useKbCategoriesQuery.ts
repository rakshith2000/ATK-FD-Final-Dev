import { useQuery } from '@tanstack/react-query';
import { fetchKbCategories } from '@/shared/modules/atk-backend/services/fetch-kb-categories';

export function useKbCategoriesQuery() {
    const queryKey = ['kbCategories'];

    const query = useQuery<Record<string, string[]>, Error>({
        queryKey,
        queryFn: fetchKbCategories,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
