import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isMeetingChatResponse } from '../type-guard/meeting-ai.guard';
import type { MeetingChatRequest, MeetingChatResponse } from '../types/meeting-ai';

const postMeetingChatMessage = async ({ meeting_ids, question, conversation_history }: MeetingChatRequest) => {
    return withApiResponseHandler<MeetingChatResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.meeting_chat, {
            meeting_ids,
            question,
            conversation_history,
        });

        if (response?.data?.output?.data && isMeetingChatResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to get chat-message from API Response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default postMeetingChatMessage;
