import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { GetMeetingTranscriptResponse, MeetingId, MeetingRetrievalType } from '../types/meeting-ai';
import { isGetMeetingTranscriptResponse } from '../type-guard/meeting-ai.guard';

const fetchTranscriptMeeting = async ({ meetingId, retrievalType }: { meetingId: MeetingId; retrievalType: MeetingRetrievalType }): Promise<GetMeetingTranscriptResponse> => {
    return withApiResponseHandler<GetMeetingTranscriptResponse>(async () => {
        const response = await backendApiClient.get(
            appConfig.backend.api.meeting_transcript.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId).replaceAll(/<MEETING_RETRIEVAL_TYPE_PLACEHOLDER>/g, retrievalType),
        );

        if (response?.data?.output?.data && isGetMeetingTranscriptResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrieve the meeting transcript details from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default fetchTranscriptMeeting;
