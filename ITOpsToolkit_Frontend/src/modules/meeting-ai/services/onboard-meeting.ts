import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isOnboardMeetingResponse } from '../type-guard/meeting-ai.guard';
import type { OnboardMeetingRequest, OnboardMeetingResponse } from '../types/meeting-ai';

const createMeeting = async ({ title, web_meeting_url, groups }: OnboardMeetingRequest) => {
    return withApiResponseHandler<OnboardMeetingResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.meeting_onboard, {
            title,
            web_meeting_url,
            groups,
        });

        if (response?.data?.output?.data && isOnboardMeetingResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to Onboard Meeting from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default createMeeting;
