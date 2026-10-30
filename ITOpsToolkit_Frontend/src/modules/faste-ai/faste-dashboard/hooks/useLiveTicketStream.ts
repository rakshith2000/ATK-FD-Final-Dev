import { useState, useEffect } from 'react';
import { z } from 'zod';
import { FASTEAI_CORE_WS, FASTEAI_CORE_BASE, getValidToken } from '@/api/axios-clients/fasteai/fasteaiAuth';

export const ticketStreamPayloadSchema = z.union([
    z.array(z.union([z.string(), z.number()])),
    z.object({
        ticket_numbers: z.array(z.union([z.string(), z.number()])).optional(),
        tickets: z.array(z.union([z.string(), z.number()])).optional(),
        data: z.array(z.union([z.string(), z.number()])).optional(),
    }),
    z.string(),
    z.number(),
]);

export type TicketStreamPayload = z.infer<typeof ticketStreamPayloadSchema>;

const extractNumbers = (rawData: unknown): string[] => {
    const result = ticketStreamPayloadSchema.safeParse(rawData);
    if (!result.success) return [];

    const data = result.data;
    if (Array.isArray(data)) {
        return data.map((item) => String(item).trim());
    }

    if (typeof data === 'object' && data !== null) {
        const list = data.ticket_numbers ?? data.tickets ?? data.data;
        if (Array.isArray(list)) {
            return list.map((item) => String(item).trim());
        }
    }

    if (typeof data === 'string' || typeof data === 'number') {
        return [String(data).trim()];
    }

    return [];
};

export const useLiveTicketStream = (): string[] => {
    const [ticketNumbers, setTicketNumbers] = useState<string[]>([]);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let isCancelled = false;

        const connectWebSocket = async () => {
            try {
                const token = await getValidToken(FASTEAI_CORE_BASE);

                if (isCancelled) return;

                ws = new WebSocket(`${FASTEAI_CORE_WS}/ws/ticket_list`);

                ws.onopen = () => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ token }));
                    }
                };

                ws.onmessage = (event: MessageEvent) => {
                    try {
                        const parsed: unknown = JSON.parse(event.data);
                        const extracted = extractNumbers(parsed);
                        setTicketNumbers(extracted);
                    } catch {
                        if (typeof event.data === 'string' && event.data.trim()) {
                            setTicketNumbers([event.data.trim()]);
                        }
                    }
                };

                ws.onerror = () => {};

                ws.onclose = () => {
                    if (!isCancelled) {
                        reconnectTimeout = setTimeout(() => {
                            void connectWebSocket();
                        }, 5000);
                    }
                };
            } catch {
                if (!isCancelled) {
                    reconnectTimeout = setTimeout(() => {
                        void connectWebSocket();
                    }, 5000);
                }
            }
        };

        void connectWebSocket();

        return () => {
            isCancelled = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }

            if (ws) {
                ws.onopen = null;
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;

                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            }
        };
    }, []);

    return ticketNumbers;
};
