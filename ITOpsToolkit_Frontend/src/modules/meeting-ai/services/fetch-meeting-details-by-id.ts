import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { GetMeetingDetailsResponse, MeetingId } from '../types/meeting-ai';
import { isGetMeetingDetailsResponse } from '../type-guard/meeting-ai.guard';

const fetchMeetingDetailsById = async ({ meetingId }: { meetingId: MeetingId }): Promise<GetMeetingDetailsResponse> => {
    return withApiResponseHandler<GetMeetingDetailsResponse>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.meeting_details_by_meeting_id.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId));

        if (response?.data?.output?.data && isGetMeetingDetailsResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrive the meeting details from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default fetchMeetingDetailsById;
