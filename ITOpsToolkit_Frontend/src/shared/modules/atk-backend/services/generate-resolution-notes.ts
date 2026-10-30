import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { ConversationEntry } from '@/shared/components/smart/ChatBot/ChatBot';

const genereateResolutionNotes = async ({ conversation_history }: { conversation_history: ConversationEntry[] }): Promise<string> => {
    return withApiResponseHandler<string>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.generateResolutionNotes, {
            conversation_history,
        });

        if (response?.data?.output?.data && response?.data?.output?.data?.response && typeof response?.data?.output?.data?.response === 'string') {
            return response?.data?.output?.data?.response;
        } else {
            throw new Error('Unable to get the Generate Resoultion Notes response from API !, response?.data?.output?.data schemea is invalid !');
        }
    });
};

export default genereateResolutionNotes;
