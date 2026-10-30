import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createAuthenticatedWebSocket } from '@/api/axios-clients/fasteai/fasteaiAuth';
import {
    computeTicketProgress,
    deriveTokensFromLogs,
    extractLogs,
    finalCompletionFromLogs,
    isCompletionFrame,
    logKey,
    parseLogTime,
    toLiveLogFrame,
    type LiveLogFrame,
} from '../utils/activeTicketHelpers';

interface IncidentItem {
    number?: string;
}

interface FetchLikeResponse {
    status: number;
    data: unknown;
}

type FasteaiFetchLike = (url: string, baseUrl: string) => Promise<FetchLikeResponse>;

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const COMPLETION_HOLD_MS = 2 * 60 * 1000; // card stays on the Active Tickets tab for 2 minutes after completion

export const useLiveTaskLogs = (incidentData: IncidentItem[], fasteaiFetch: FasteaiFetchLike, FASTEAI_CORE_BASE: string, FASTEAI_CORE_WS: string) => {
    const [allReceivedLogs, setAllReceivedLogs] = useState<Record<string, LiveLogFrame[]>>({});
    const [finished, setFinished] = useState<Record<string, number>>({}); // ticket → end time (ms)
    const [completedTickets, setCompletedTickets] = useState<Set<string>>(new Set());
    const [wsDisconnected, setWsDisconnected] = useState<Record<string, boolean>>({});
    const [seenAt, setSeenAt] = useState<Record<string, number>>({});
    const [now, setNow] = useState(() => Date.now());

    const wsRefs = useRef<Record<string, WebSocket>>({});
    const reconnectTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const reconnectAttempts = useRef<Record<string, number>>({});
    const completionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const finishedRef = useRef<Set<string>>(new Set());
    const unmountedRef = useRef(false);

    const ticketKey = incidentData
        .map((i) => i.number)
        .filter(Boolean)
        .sort()
        .join(',');

    const markFinished = useCallback((ticketNumber: string, endMs: number) => {
        finishedRef.current.add(ticketNumber);
        setFinished((prev) => (prev[ticketNumber] !== undefined ? prev : { ...prev, [ticketNumber]: endMs }));
        if (completionTimers.current[ticketNumber]) return;
        completionTimers.current[ticketNumber] = setTimeout(() => {
            setCompletedTickets((prev) => new Set([...prev, ticketNumber]));
            delete completionTimers.current[ticketNumber];
        }, COMPLETION_HOLD_MS);
    }, []);

    const ingest = useCallback(
        (ticketNumber: string, frames: LiveLogFrame[]) => {
            setAllReceivedLogs((prev) => {
                const existing = prev[ticketNumber] ?? [];
                const keys = new Set(existing.map(logKey));
                const fresh = frames.filter((f) => !keys.has(logKey(f)));
                if (fresh.length === 0) return prev;
                const merged = [...existing, ...fresh].sort((a, b) => (parseLogTime(a.time) ?? 0) - (parseLogTime(b.time) ?? 0));
                return { ...prev, [ticketNumber]: merged };
            });
            const completion = frames.find(isCompletionFrame);
            if (completion) markFinished(ticketNumber, parseLogTime(completion.time) ?? Date.now());
        },
        [markFinished],
    );

    // Fallback timer start for tickets with no agent log yet.
    useEffect(() => {
        const at = Date.now();
        setSeenAt((prev) => {
            let changed = false;
            const next = { ...prev };
            incidentData.forEach(({ number }) => {
                if (number && next[number] === undefined) {
                    next[number] = at;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [ticketKey]);

    // Historical logs (only re-run when the set of tickets changes).
    useEffect(() => {
        let cancelled = false;
        incidentData.forEach(async ({ number: ticketNumber }) => {
            if (!ticketNumber) return;
            try {
                const response = await fasteaiFetch(`${FASTEAI_CORE_BASE}/current-tasks/${ticketNumber}/logs`, FASTEAI_CORE_BASE);
                if (cancelled || response.status < 200 || response.status >= 300) return;
                const logs = extractLogs(response.data);
                if (logs.length > 0) ingest(ticketNumber, logs);
            } catch {}
        });
        return () => {
            cancelled = true;
        };
    }, [ticketKey, fasteaiFetch, FASTEAI_CORE_BASE]);

    const connect = useCallback(
        (ticketNumber: string) => {
            if (unmountedRef.current) return;
            const existingWs = wsRefs.current[ticketNumber];
            if (existingWs && (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING)) return;

            const scheduleReconnect = () => {
                if (unmountedRef.current || finishedRef.current.has(ticketNumber)) return;
                const attempts = (reconnectAttempts.current[ticketNumber] ?? 0) + 1;
                reconnectAttempts.current[ticketNumber] = attempts;
                if (attempts > MAX_RECONNECT_ATTEMPTS) return;
                clearTimeout(reconnectTimers.current[ticketNumber]);
                reconnectTimers.current[ticketNumber] = setTimeout(() => connect(ticketNumber), RECONNECT_DELAY_MS * Math.min(attempts, 5));
            };

            // The server expects the JWT as the first frame; an unauthenticated socket is closed immediately.
            createAuthenticatedWebSocket(
                `${FASTEAI_CORE_WS}/ws/task/${ticketNumber}`,
                FASTEAI_CORE_BASE,
                () => {
                    reconnectAttempts.current[ticketNumber] = 0;
                    setWsDisconnected((prev) => ({ ...prev, [ticketNumber]: false }));
                },
                (event: MessageEvent) => {
                    try {
                        const frame = toLiveLogFrame(JSON.parse(event.data));
                        if (frame) ingest(ticketNumber, [frame]);
                    } catch {}
                },
                (ev: CloseEvent) => {
                    delete wsRefs.current[ticketNumber];
                    if (unmountedRef.current || finishedRef.current.has(ticketNumber)) return;
                    if (ev.code !== 1000) setWsDisconnected((prev) => ({ ...prev, [ticketNumber]: true }));
                    scheduleReconnect();
                },
                () => setWsDisconnected((prev) => ({ ...prev, [ticketNumber]: true })),
            )
                .then((ws) => {
                    if (unmountedRef.current) {
                        ws.close();
                        return;
                    }
                    wsRefs.current[ticketNumber] = ws;
                })
                .catch(() => {
                    setWsDisconnected((prev) => ({ ...prev, [ticketNumber]: true }));
                    scheduleReconnect();
                });
        },
        [FASTEAI_CORE_WS, FASTEAI_CORE_BASE, ingest],
    );

    useEffect(() => {
        const current = new Set(incidentData.map((i) => i.number).filter((n): n is string => Boolean(n)));
        current.forEach((ticketNumber) => connect(ticketNumber));

        // Close sockets for tickets that are no longer active.
        Object.keys(wsRefs.current).forEach((ticketNumber) => {
            if (current.has(ticketNumber)) return;
            const ws = wsRefs.current[ticketNumber];
            delete wsRefs.current[ticketNumber];
            clearTimeout(reconnectTimers.current[ticketNumber]);
            ws.onclose = null;
            ws.close(1000);
        });
    }, [ticketKey, connect]);

    const hasRunningTimer = Object.keys(seenAt).some((t) => finished[t] === undefined);
    useEffect(() => {
        if (!hasRunningTimer) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [hasRunningTimer]);

    useEffect(() => {
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
            Object.values(wsRefs.current).forEach((ws) => {
                ws.onclose = null;
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000);
            });
            wsRefs.current = {};
            Object.values(reconnectTimers.current).forEach(clearTimeout);
            Object.values(completionTimers.current).forEach(clearTimeout);
        };
    }, []);

    const runningSeconds = useMemo(() => {
        const result: Record<string, number> = {};
        for (const [ticketNumber, seen] of Object.entries(seenAt)) {
            const logs = allReceivedLogs[ticketNumber] ?? [];
            const firstLog = logs.length > 0 ? parseLogTime(logs[0].time) : null;
            const { durationSeconds } = finalCompletionFromLogs(logs);
            const end = finished[ticketNumber];
            if (end !== undefined && durationSeconds !== null) result[ticketNumber] = durationSeconds;
            else result[ticketNumber] = Math.max(((end ?? now) - (firstLog ?? seen)) / 1000, 0);
        }
        return result;
    }, [seenAt, allReceivedLogs, finished, now]);

    const isTimerRunning = useMemo(() => {
        const result: Record<string, boolean> = {};
        for (const ticketNumber of Object.keys(seenAt)) result[ticketNumber] = finished[ticketNumber] === undefined;
        return result;
    }, [seenAt, finished]);

    const progress = useMemo(() => {
        const result: Record<string, number> = {};
        for (const ticketNumber of Object.keys(seenAt)) {
            result[ticketNumber] = computeTicketProgress({
                elapsedSeconds: runningSeconds[ticketNumber] ?? 0,
                logs: allReceivedLogs[ticketNumber] ?? [],
                isFinished: finished[ticketNumber] !== undefined,
            });
        }
        return result;
    }, [seenAt, runningSeconds, allReceivedLogs, finished]);

    const tokensUsed = useMemo(() => {
        const result: Record<string, number> = {};
        for (const [ticketNumber, logs] of Object.entries(allReceivedLogs)) result[ticketNumber] = deriveTokensFromLogs(logs);
        return result;
    }, [allReceivedLogs]);

    return {
        allReceivedLogs,
        progress,
        runningSeconds,
        isTimerRunning,
        tokensUsed,
        completedTickets,
        wsDisconnected,
    };
};
