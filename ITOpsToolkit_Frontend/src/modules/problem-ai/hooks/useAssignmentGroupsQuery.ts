import { useQuery } from '@tanstack/react-query';
import type { SelectOption } from '@/shared/components/ui/InputFields';
import fetchAssignmentGroups from '../services/fetch-assignment-groups';
import { stringsToSelectOptions } from '../utils/to-select-options';
import type { ListAssignmentGroupsResponse } from '../types/problem-ai';

export const assignmentGroupsQueryKey = ['problemAssignmentGroups'] as const;

export function useAssignmentGroupsQuery() {
    const queryKey = [...assignmentGroupsQueryKey];
    const query = useQuery<ListAssignmentGroupsResponse, Error, SelectOption[]>({
        queryKey: [...queryKey],
        queryFn: fetchAssignmentGroups,
        select: stringsToSelectOptions,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
