import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isGetArchivedArticlesResponse } from '../type-guard/meeting-ai.guard';
import type { GetArchivedArticlesResponse, MeetingId } from '../types/meeting-ai';

const fetchMeetingArchieveArticle = async ({ meetingId }: { meetingId: MeetingId }): Promise<GetArchivedArticlesResponse> => {
    return withApiResponseHandler<GetArchivedArticlesResponse>(async () => {
        const url = appConfig.backend.api.meeting_archived_articles.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId);

        const response = await backendApiClient.get(url);

        if (!isGetArchivedArticlesResponse(response?.data?.output?.data)) {
            throw new Error('Unable to retrieve the meeting details from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response.data schema is invalid !',
                },
            });
        }

        return response.data.output.data;
    });
};

export default fetchMeetingArchieveArticle;
