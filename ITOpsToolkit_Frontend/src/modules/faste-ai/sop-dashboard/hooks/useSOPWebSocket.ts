import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getValidToken, SOP_GENERATION_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { SOP_QUERY_KEYS } from '../constants/query-keys';

export type Message = {
    id?: string;
    type?: string;
    content: string | Record<string, unknown> | null;
    role: 'user' | 'assistant' | 'error';
    sop_content?: unknown;
    workflow?: unknown[];
    u_sop_type?: string;
    sop_type?: string;
    suggestions?: string[];
    inputType?: 'text' | 'voice' | 'document';
    timestamp?: string;
    phase?: string;
    category?: string;
    is_complete?: boolean;
    raw_data?: Record<string, unknown>;
};

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

export const useSOPWebSocket = (url: string) => {
    const queryClient = useQueryClient();

    const wsRef = useRef<WebSocket | null>(null);
    const connIdRef = useRef(0);
    const stoppedRef = useRef(false);
    const attemptsRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);
    const connectRef = useRef<() => void>(() => {});

    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const sessionIdRef = useRef<string | null>(null);
    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const queryKey = SOP_QUERY_KEYS.MESSAGES(sessionId);

    const { data: messages = [] } = useQuery<Message[]>({
        queryKey,
        queryFn: () => queryClient.getQueryData<Message[]>(queryKey) || [],
        initialData: [],
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (!mountedRef.current || stoppedRef.current) return;

        if (attemptsRef.current >= MAX_ATTEMPTS) {
            setIsReconnecting(false);
            setConnectionError('Connection lost. Please refresh the page to reconnect.');
            return;
        }

        const delay = Math.min(BASE_DELAY_MS * 2 ** attemptsRef.current, 20_000);
        attemptsRef.current += 1;
        setIsReconnecting(true);

        timerRef.current = setTimeout(() => {
            if (mountedRef.current && !stoppedRef.current) connectRef.current();
        }, delay);
    }, []);

    const appendMessageToCache = useCallback(
        (targetSessionId: string | null, newMessage: Message) => {
            const targetKey = SOP_QUERY_KEYS.MESSAGES(targetSessionId);
            queryClient.setQueryData<Message[]>(targetKey, (old = []) => [...old, newMessage]);
        },
        [queryClient],
    );

    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

        clearTimer();
        const myId = ++connIdRef.current;

        let ws: WebSocket;
        try {
            ws = new WebSocket(url);
        } catch {
            scheduleReconnect();
            return;
        }
        wsRef.current = ws;

        ws.onopen = async () => {
            if (myId !== connIdRef.current || !mountedRef.current) {
                ws.close();
                return;
            }

            try {
                const token = await getValidToken(SOP_GENERATION_BASE);
                if (myId !== connIdRef.current || !mountedRef.current) {
                    ws.close();
                    return;
                }
                ws.send(JSON.stringify({ token }));

                attemptsRef.current = 0;
                stoppedRef.current = false;
                setIsConnected(true);
                setIsProcessing(false);
                setIsReconnecting(false);
                setConnectionError(null);
            } catch {
                setConnectionError('Authentication failed. Please refresh the page.');
                stoppedRef.current = true;
                ws.close();
            }
        };

        ws.onmessage = (ev: MessageEvent) => {
            let currentSessionId = sessionIdRef.current;
            try {
                const data = JSON.parse(ev.data);

                if (data?.session_id) {
                    setSessionId(data.session_id);
                    currentSessionId = data.session_id;
                }

                const incomingRole = data?.role;
                const assignedRole: 'user' | 'assistant' | 'error' =
                    incomingRole === 'user' || incomingRole === 'assistant' || incomingRole === 'error' ? incomingRole : 'assistant';

                const incomingInputType = data?.inputType;
                const assignedInputType = incomingInputType === 'text' || incomingInputType === 'voice' || incomingInputType === 'document' ? incomingInputType : undefined;

                // FIX: Extract workflow and sop_type from incoming WebSocket JSON data
                const workflow = data?.workflow || data?.sop_content?.workflow || data?.content?.workflow;
                const uSopType = data?.u_sop_type || data?.sop_type;

                appendMessageToCache(currentSessionId, {
                    id: data?.id,
                    type: data?.type,
                    role: assignedRole,
                    content: data?.content ?? data?.message ?? data,
                    sop_content: data?.sop_content,
                    workflow: Array.isArray(workflow) ? workflow : undefined,
                    u_sop_type: uSopType,
                    sop_type: data?.sop_type,
                    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
                    phase: data?.phase,
                    category: data?.category,
                    is_complete: data?.is_complete,
                    inputType: assignedInputType,
                    timestamp: data?.timestamp || new Date().toISOString(),
                    raw_data: typeof data === 'object' ? data : undefined,
                });
                setIsProcessing(false);
            } catch {
                appendMessageToCache(currentSessionId, {
                    content: ev.data,
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                });
                setIsProcessing(false);
            }
        };

        ws.onclose = () => {
            if (myId !== connIdRef.current) return;

            wsRef.current = null;
            setIsConnected(false);
            setIsProcessing(false);

            if (!stoppedRef.current && mountedRef.current) {
                scheduleReconnect();
            } else {
                setIsReconnecting(false);
            }
        };

        ws.onerror = () => {
            setIsConnected(false);
            setIsProcessing(false);
        };
    }, [url, clearTimer, scheduleReconnect, appendMessageToCache]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        stoppedRef.current = true;
        connIdRef.current++;
        clearTimer();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setIsReconnecting(false);
    }, [clearTimer]);

    const sendRawMessage = useCallback((msg: string | object, type: 'text' | 'voice' | 'document' = 'text') => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setConnectionError('WebSocket is not open.');
            return;
        }

        const payload = typeof msg === 'string' ? { type, message: msg } : { type, ...msg };
        wsRef.current.send(JSON.stringify(payload));
        setIsProcessing(true);
    }, []);

    const startNewSession = useCallback(() => {
        queryClient.setQueryData(SOP_QUERY_KEYS.MESSAGES(sessionId), []);
        setSessionId(null);
    }, [queryClient, sessionId]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && !wsRef.current && !stoppedRef.current && mountedRef.current) {
                attemptsRef.current = 0;
                clearTimer();
                setIsReconnecting(false);
                connectRef.current();
            }
        };
        const onOnline = () => {
            if (!wsRef.current && !stoppedRef.current && mountedRef.current) {
                attemptsRef.current = 0;
                clearTimer();
                setIsReconnecting(false);
                connectRef.current();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [clearTimer]);

    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            stoppedRef.current = true;
            connIdRef.current++;
            clearTimer();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect, clearTimer]);

    return {
        isConnected,
        isReconnecting,
        isProcessing,
        messages,
        sessionId,
        sendRawMessage,
        connect,
        disconnect,
        startNewSession,
        connectionError,
    };
};
