import { useQuery } from '@tanstack/react-query';
import fetchMeetingDetailsById from '../services/fetch-meeting-details-by-id';
import type { GetMeetingDetailsResponse, MeetingId } from '../types/meeting-ai';

export const meetingDetailsQueryKey = ['meetingDetails'] as const;

export function useMeetingDetailsByIdQuery(meetingId: MeetingId) {
    const queryKey = [...meetingDetailsQueryKey, meetingId];
    const query = useQuery<GetMeetingDetailsResponse, Error>({
        queryKey: [...queryKey],
        queryFn: () => fetchMeetingDetailsById({ meetingId }),
        retry: false,
        enabled: Boolean(meetingId),
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
