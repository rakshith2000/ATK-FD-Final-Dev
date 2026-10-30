import { useQuery } from '@tanstack/react-query';
import { getDictionaryFields } from '../services/snow-dictionary-introspection';

export const DICTIONARY_FIELDS_QUERY_KEY = 'dictionary-fields' as const;

export function useDictionaryFieldsQuery(tableName: string | undefined) {
    const queryKey = [DICTIONARY_FIELDS_QUERY_KEY, tableName];

    const query = useQuery({
        queryKey: [...queryKey],
        queryFn: () => getDictionaryFields(tableName!),
        enabled: !!tableName,
        staleTime: 0,
        retry: false,
    });

    return { ...query, queryKey };
}
