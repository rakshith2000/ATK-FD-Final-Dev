import { useQuery } from '@tanstack/react-query';
import { fetchUserKnowledgeBaseIds } from '@/shared/modules/servicenow/services/fetch-user-readable-knowledge-data';

export function useUserKnowledgeBaseIds() {
    const queryKey = ['user-knowledge-base-ids'];

    const query = useQuery<Array<string>, Error>({
        queryKey: queryKey,
        queryFn: fetchUserKnowledgeBaseIds,
        retry: false,
        staleTime: 30 * 60 * 1000,
    });

    return query;
}
