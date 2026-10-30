import { useQuery } from '@tanstack/react-query';
import fetchMeetingAuthDetails from '../services/fetch-meeting-auth-details';
import type { GetPublicFlowAuthDetailsResponse, MeetingId, MeetingRetrievalType } from '../types/meeting-ai';

export function useMeetingAuthDetailsQuery(meetingId: MeetingId, retrievalType: MeetingRetrievalType) {
    const queryKey = ['meetingAuthDetails', meetingId, retrievalType];
    const query = useQuery<GetPublicFlowAuthDetailsResponse, Error>({
        queryKey: [...queryKey],
        queryFn: () => fetchMeetingAuthDetails({ meetingId, retrievalType }),
        retry: false,
        enabled: Boolean(meetingId) && Boolean(retrievalType),
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
