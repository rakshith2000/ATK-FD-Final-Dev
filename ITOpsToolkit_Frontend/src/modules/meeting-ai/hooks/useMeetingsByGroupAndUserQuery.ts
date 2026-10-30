import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import fetchMeetingByGrpUser from '../services/fetch-meetings-by-group-and-user';
import { filterVisibleMeetings } from '../utils/filter-visible-meetings';
import type { ListMeetingsByParticipantAndGroupResponse, Meeting } from '../types/meeting-ai';

export const meetingsByGroupAndUserQueryKey = ['meetingsByGroupAndUser'] as const;

export function useMeetingsByGroupAndUserQuery(groups: string) {
    const { state } = useAuth();
    const email = state.user?.email ?? '';

    const queryKey = [...meetingsByGroupAndUserQueryKey, groups, email];
    const query = useQuery<ListMeetingsByParticipantAndGroupResponse, Error, Meeting[]>({
        queryKey: [...queryKey],
        queryFn: async () => {
            return fetchMeetingByGrpUser({ email, groups });
        },
        retry: false,
        enabled: Boolean(groups) || Boolean(email),
        staleTime: 5 * 60 * 1000,
        select: filterVisibleMeetings,
    });

    return { ...query, queryKey };
}
