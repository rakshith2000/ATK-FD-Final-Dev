import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { MeetingId, MeetingRetrievalType, StartOrRefreshMeetingResponse } from '../types/meeting-ai';
import { isStartOrRefreshMeetingResponse } from '../type-guard/meeting-ai.guard';

const startOrRefreshMeeting = async ({ meetingId, retrievalType }: { meetingId: MeetingId; retrievalType: MeetingRetrievalType }): Promise<StartOrRefreshMeetingResponse> => {
    return withApiResponseHandler<StartOrRefreshMeetingResponse>(async () => {
        const response = await backendApiClient.get(
            appConfig.backend.api.meeting_start_refresh.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId).replaceAll(/<MEETING_RETRIEVAL_TYPE_PLACEHOLDER>/g, retrievalType),
        );

        if (response?.data?.output?.data && isStartOrRefreshMeetingResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrieve the meeting verified credentials from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default startOrRefreshMeeting;
