import { useQuery } from '@tanstack/react-query';
import fetchTranscriptMeeting from '../services/fetch-meeting-transcript';
import type { GetMeetingTranscriptResponse, MeetingId, MeetingRetrievalType } from '../types/meeting-ai';

export const meetingTranscriptQueryKey = ['meetingTranscript'] as const;

export function useMeetingTranscriptQuery(meetingId: MeetingId, retrievalType: MeetingRetrievalType, enabled: boolean = true) {
    const queryKey = [...meetingTranscriptQueryKey, meetingId, retrievalType];
    const query = useQuery<GetMeetingTranscriptResponse, Error>({
        queryKey: [...queryKey],
        queryFn: () => fetchTranscriptMeeting({ meetingId, retrievalType }),
        retry: false,
        enabled: enabled && Boolean(meetingId) && Boolean(retrievalType),
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
