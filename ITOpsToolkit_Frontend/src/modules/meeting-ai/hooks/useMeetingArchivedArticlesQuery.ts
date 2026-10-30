import { useQuery } from '@tanstack/react-query';
import fetchMeetingArchieveArticle from '../services/fetch-meeting-archived-articles';
import type { GetArchivedArticlesResponse, MeetingId } from '../types/meeting-ai';

export function useMeetingArchivedArticlesQuery(meetingId: MeetingId) {
    const queryKey = ['meetingArchivedArticles', meetingId];
    const query = useQuery<GetArchivedArticlesResponse, Error>({
        queryKey: [...queryKey],
        queryFn: () => fetchMeetingArchieveArticle({ meetingId }),
        retry: false,
        enabled: Boolean(meetingId),
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
}
