import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSOPWebSocket } from '../useSOPWebSocket';
import { SOP_QUERY_KEYS } from '../../constants/query-keys';
import { SOP_GENERATION_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import fasteaiApiClient from '@/api/axios-clients/fasteai/fasteai-api-client';
import type { Message } from '../useSOPWebSocket';

interface SendMessagePayload {
    content: string;
    inputType: 'text' | 'voice' | 'document';
    current_sop_content?: string;
}

export function useSopEngine(initialSessionId: string | null = null) {
    const queryClient = useQueryClient();

    const generatedWebSocketUrl = useMemo(() => {
        const wsBase = SOP_GENERATION_BASE.replace(/^http/, 'ws');
        const randomStub = Math.random().toString(36).substring(2, 11);
        const appendSeparator = wsBase.endsWith('/') ? 'ws/session_' : '/ws/session_';
        return `${wsBase}${appendSeparator}${Date.now()}_${randomStub}`;
    }, []);

    const ws = useSOPWebSocket(generatedWebSocketUrl);
    const activeSessionId = initialSessionId || ws.sessionId;
    const queryKey = SOP_QUERY_KEYS.MESSAGES(activeSessionId);

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: SendMessagePayload) => {
            if (ws.isConnected) {
                queryClient.setQueryData<Message[]>(queryKey, (old = []) => [
                    ...old,
                    {
                        role: 'user',
                        content: payload.content,
                        inputType: payload.inputType,
                        timestamp: new Date().toISOString(),
                    },
                ]);

                const wsPayload = {
                    message: payload.content,
                    current_sop_content: payload.current_sop_content,
                };
                ws.sendRawMessage(wsPayload, payload.inputType);
                return { isBackgroundJobRunning: true };
            }

            if (!activeSessionId) {
                throw new Error('Session not initialized');
            }

            const response = await fasteaiApiClient.post(`/sops/session/${activeSessionId}/message`, payload);
            return response.data;
        },
    });

    const startNewSession = () => {
        ws.startNewSession();
        queryClient.setQueryData(queryKey, []);
    };

    return {
        messages: ws.messages,
        sessionId: activeSessionId,
        isConnected: ws.isConnected,
        isProcessing: ws.isProcessing || sendMessageMutation.isPending,
        connectionError: ws.connectionError,
        sendMessage: (content: string, inputType: 'text' | 'voice' | 'document' = 'text', current_sop_content?: string) => {
            sendMessageMutation.mutate({ content, inputType, current_sop_content });
        },
        startNewSession,
        connect: ws.connect,
        disconnect: ws.disconnect,
    };
}
