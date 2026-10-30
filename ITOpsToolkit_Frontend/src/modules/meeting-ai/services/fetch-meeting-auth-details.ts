import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { GetPublicFlowAuthDetailsResponse, MeetingId, MeetingRetrievalType } from '../types/meeting-ai';
import { isGetPublicFlowAuthDetailsResponse } from '../type-guard/meeting-ai.guard';

const fetchMeetingAuthDetails = async ({ meetingId, retrievalType }: { meetingId: MeetingId; retrievalType: MeetingRetrievalType }): Promise<GetPublicFlowAuthDetailsResponse> => {
    return withApiResponseHandler<GetPublicFlowAuthDetailsResponse>(async () => {
        const response = await backendApiClient.get(
            appConfig.backend.api.meeting_get_auth_details.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId).replaceAll(/<MEETING_RETRIEVAL_TYPE_PLACEHOLDER>/g, retrievalType),
        );

        if (response?.data?.output?.data && isGetPublicFlowAuthDetailsResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrive the meeting auth details from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default fetchMeetingAuthDetails;
