import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTaskLogs } from '../services/fetch-task-logs';
import { createAuthenticatedWebSocket, FASTEAI_CORE_WS, FASTEAI_CORE_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { ticketId, formatLog, TERMINAL_RE } from '../utils/activeSchedulesHelpers';
import type { ScheduleTask, LogMessage } from '../types/types';

export type WsState = 'connecting' | 'connected' | 'disconnected';

export function useActiveSchedulesLogs(isOpen: boolean, tasks: ScheduleTask[], onClose: () => void) {
    const triggered = tasks.filter((t) => t.status === 'Triggered');
    const [selectedId, setSelectedId] = useState<string | null>(triggered.length > 0 ? triggered[0]._id : null);

    const [liveLogs, setLiveLogs] = useState<Record<string, LogMessage[]>>({});
    const [wsState, setWsState] = useState<Record<string, WsState>>({});
    const wsRefs = useRef<Record<string, WebSocket>>({});
    const logEndRef = useRef<HTMLDivElement | null>(null);
    const closedRef = useRef(false);

    useEffect(() => {
        if (triggered.length > 0 && (!selectedId || !triggered.some((t) => t._id === selectedId))) {
            setSelectedId(triggered[0]._id);
        }
    }, [tasks]);

    const selectedTask = triggered.find((t) => t._id === selectedId);
    const selectedTid = selectedTask ? ticketId(selectedTask) : '';

    const { data: historicalLogs = [] } = useQuery({
        queryKey: ['taskLogs', selectedTid],
        queryFn: () => fetchTaskLogs(selectedTid),
        enabled: isOpen && !!selectedTid,
        staleTime: 1000 * 60,
    });

    useEffect(() => {
        if (!isOpen) return;

        triggered.forEach((task) => {
            if (wsRefs.current[task._id]) return;
            const tid = ticketId(task);
            setWsState((prev) => ({ ...prev, [task._id]: 'connecting' }));

            createAuthenticatedWebSocket(
                `${FASTEAI_CORE_WS}/ws/task/${tid}`,
                FASTEAI_CORE_BASE,
                () => setWsState((prev) => ({ ...prev, [task._id]: 'connected' })),
                (event: MessageEvent) => {
                    try {
                        const msg: LogMessage = JSON.parse(event.data);
                        setLiveLogs((prev) => {
                            const taskLogs = prev[task._id] || [];
                            const exists = taskLogs.some((l) => l.time === msg.time && l.message === msg.message);
                            return exists ? prev : { ...prev, [task._id]: [...taskLogs, msg] };
                        });
                    } catch {}
                },
                (ev: CloseEvent) => {
                    if (ev.code !== 1000) setWsState((prev) => ({ ...prev, [task._id]: 'disconnected' }));
                },
                () => setWsState((prev) => ({ ...prev, [task._id]: 'disconnected' })),
            ).then((ws: WebSocket) => {
                wsRefs.current[task._id] = ws;
            });
        });

        return () => {
            Object.values(wsRefs.current).forEach((ws) => {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            });
            wsRefs.current = {};
        };
    }, [isOpen, tasks]);

    const getCombinedLogs = (taskId: string) => {
        const live = liveLogs[taskId] || [];
        const combined = [...historicalLogs, ...live];

        const uniqueLogs = combined.reduce<LogMessage[]>((acc, current) => {
            const isDuplicate = acc.some((item) => item.time === current.time && item.message === current.message);
            if (!isDuplicate) acc.push(current);
            return acc;
        }, []);

        return uniqueLogs.sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
    };

    const selectedLogs = selectedId ? getCombinedLogs(selectedId) : [];
    const visibleLogs = selectedLogs.filter((log) => formatLog(log).trim());
    const latestVisibleLog = visibleLogs[visibleLogs.length - 1];
    const latestAgent = latestVisibleLog?.agent_name || latestVisibleLog?.source || 'agent';
    const isTerminalLog = !!latestVisibleLog && TERMINAL_RE.test(formatLog(latestVisibleLog));
    const selectedWsState = selectedId ? wsState[selectedId] : undefined;
    const showWorkingLoader = selectedTask && selectedWsState !== 'disconnected' && !isTerminalLog;

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [liveLogs, historicalLogs, selectedId]);

    useEffect(() => {
        if (isTerminalLog && !closedRef.current) {
            closedRef.current = true;
            const timeout = setTimeout(onClose, 3000);
            return () => clearTimeout(timeout);
        }
    }, [isTerminalLog, onClose]);

    const handleDownload = (task: ScheduleTask) => {
        const logsToDownload = getCombinedLogs(task._id);
        const text = logsToDownload.map((l) => `[${l.time || ''}] [${l.agent_name || l.source || 'system'}] ${formatLog(l)}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ticketId(task)}_logs.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return {
        triggered,
        selectedId,
        setSelectedId,
        selectedTask,
        liveLogs,
        wsState,
        visibleLogs,
        latestAgent,
        isTerminalLog,
        selectedWsState,
        showWorkingLoader,
        logEndRef,
        handleDownload,
    };
}
