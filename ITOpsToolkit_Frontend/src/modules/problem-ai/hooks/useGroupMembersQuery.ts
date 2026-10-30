import { useQuery } from '@tanstack/react-query';
import type { SelectOption } from '@/shared/components/ui/InputFields';
import fetchGroupMembers from '../services/fetch-group-members';
import { stringsToSelectOptions } from '../utils/to-select-options';
import type { ListGroupMembersResponse } from '../types/problem-ai';

export const groupMembersQueryKey = ['problemGroupMembers'] as const;

export function useGroupMembersQuery(assignmentGroup: string) {
    const queryKey = [...groupMembersQueryKey, assignmentGroup];
    const query = useQuery<ListGroupMembersResponse, Error, SelectOption[]>({
        queryKey: [...queryKey],
        queryFn: () => fetchGroupMembers({ assignment_group: assignmentGroup }),
        select: stringsToSelectOptions,
        retry: false,
        enabled: Boolean(assignmentGroup),
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
