import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';

import type { ConversationEntry, BaseChatMessageResponseData } from '@/shared/components/smart/ChatBot/ChatBot';

export interface SendMessageParams {
    query: string;
    conversation: Array<ConversationEntry>;
}

export interface ChatMessageResponseData extends BaseChatMessageResponseData {
    work_notes_and_comments: string;
}

const postTechAssitChatMessage = async ({ query, conversation }: SendMessageParams): Promise<ChatMessageResponseData> => {
    return withApiResponseHandler<ChatMessageResponseData>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.chatBot, {
            query: query,
            conversation_history: conversation.map((e) => ({ role: e.role, content: e.content })),
        });

        if (response?.data?.output?.data && 'response' in response.data.output.data && isChatMessageResponseData(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        }

        throw new Error('Unable to get Chat response from API !, response?.data?.output?.data schema is invalid ');
    });
};

export default postTechAssitChatMessage;

function isChatMessageResponseData(data: unknown): data is ChatMessageResponseData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;

    if (typeof d.response !== 'string') return false;

    if (!Array.isArray(d.conversation_history)) return false;

    if (typeof d.work_notes_and_comments !== 'string') return false;

    return d.conversation_history.every((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const e = entry as Record<string, unknown>;
        return typeof e.content === 'string' && (e.role === 'assistant' || e.role === 'user');
    });
}
