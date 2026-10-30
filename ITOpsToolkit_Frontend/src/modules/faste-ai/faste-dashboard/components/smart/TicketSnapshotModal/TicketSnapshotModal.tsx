import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ScrollText, Check, AlertCircle } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import LoadingPlaceholder from '@/shared/components/ui/Placeholders/LoadingPlaceholder';
import { fasteaiFetch, FASTEAI_CORE_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { ActiveTicketCard, type ActiveTicketCardIncident } from '../../ui/ActiveTicketCard/ActiveTicketCard';
import { useActiveTicketDetails } from '../../../hooks/useActiveTicketDetails';
import { getTicketSnapshot } from '../../../utils/ticketSnapshotStore';
import {
    computeTicketProgress,
    deriveTokensFromLogs,
    extractLogs,
    extractTicketFieldsFromLogs,
    finalCompletionFromLogs,
    firstLogTime,
    getCurrentStatus,
    isCompletionFrame,
    mergeTicketFields,
    parseLogTime,
    type LiveLogFrame,
} from '../../../utils/activeTicketHelpers';

interface TicketSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: ActiveTicketCardIncident | null;
    onViewLogs: (ticketNumber: string) => void;
}

const LIVE_REFRESH_MS = 5000;

const fetchTicketLogs = async (ticketNumber: string): Promise<LiveLogFrame[]> => {
    const response = await fasteaiFetch(`${FASTEAI_CORE_BASE}/current-tasks/${ticketNumber}/logs`, FASTEAI_CORE_BASE);
    if (response.status < 200 || response.status >= 300) return [];
    return extractLogs(response.data);
};

export const TicketSnapshotModal: React.FC<TicketSnapshotModalProps> = ({ isOpen, onClose, ticket, onViewLogs }) => {
    const ticketNumber = ticket?.number ?? '';
    const enabled = isOpen && ticketNumber !== '';

    const snapshot = useMemo(() => (enabled ? getTicketSnapshot(ticketNumber) : null), [enabled, ticketNumber]);

    const logsQuery = useQuery({
        queryKey: ['faste-ticket-snapshot-logs', ticketNumber],
        queryFn: () => fetchTicketLogs(ticketNumber),
        enabled,
        refetchInterval: (query) => {
            const data = query.state.data;
            return data && data.length > 0 && !data.some(isCompletionFrame) ? LIVE_REFRESH_MS : false;
        },
    });
    const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

    const snowDetails = useActiveTicketDetails(enabled ? [ticketNumber] : []);

    const enrichedTicket = useMemo<ActiveTicketCardIncident | null>(() => {
        if (!ticket) return null;
        const snow = snowDetails[ticketNumber.toUpperCase()];
        return mergeTicketFields(ticket, snow ? { ...snow } : undefined, snapshot?.fields, extractTicketFieldsFromLogs(logs));
    }, [ticket, snowDetails, ticketNumber, snapshot, logs]);

    const completion = finalCompletionFromLogs(logs);
    const completionFrame = logs.find(isCompletionFrame);
    const isFinished = Boolean(completionFrame) || (logs.length === 0 && snapshot !== null);
    const isLive = logs.length > 0 && !isFinished;

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!isLive) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [isLive]);

    const runningSeconds = useMemo<number | null>(() => {
        if (completion.durationSeconds !== null) return completion.durationSeconds;
        const start = firstLogTime(logs);
        if (start !== null) {
            const end = completionFrame ? (parseLogTime(completionFrame.time) ?? now) : now;
            return Math.max((end - start) / 1000, 0);
        }
        return snapshot?.runningSeconds ?? null;
    }, [completion.durationSeconds, completionFrame, logs, now, snapshot]);

    const tokensUsed = logs.length > 0 ? Math.max(deriveTokensFromLogs(logs), snapshot?.tokensUsed ?? 0) : (snapshot?.tokensUsed ?? null);
    const progress = computeTicketProgress({ elapsedSeconds: runningSeconds ?? 0, logs, isFinished });
    const currentStatus = logs.length > 0 ? getCurrentStatus(logs) : (snapshot?.lastStep ?? 'No agent activity recorded');
    const noTaskData = !logsQuery.isLoading && logs.length === 0 && !snapshot;

    return (
        <Modal open={isOpen} onClose={onClose} size="3xl" className="p-0 overflow-hidden">
            <Modal.Header className="bg-[#011A80] text-white px-6 py-4 flex justify-between items-center overflow-hidden">
                <h3 className="text-base font-bold flex items-center gap-2 m-0 text-white">
                    <ClipboardList className="w-5 h-5 text-white" /> Active Ticket Snapshot — <span className="font-normal opacity-90">{ticketNumber}</span>
                </h3>
            </Modal.Header>

            <Modal.Body className="p-6 mb-0">
                {logsQuery.isLoading || !enrichedTicket ? (
                    <div className="flex items-center justify-center py-10">
                        <LoadingPlaceholder />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        {noTaskData && (
                            <div className="w-full max-w-2xl flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-[11px] font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                No FasteAI task record was found for this ticket — running time and token count are unavailable.
                            </div>
                        )}
                        <ActiveTicketCard
                            className="w-full"
                            incident={enrichedTicket}
                            progress={progress}
                            currentStatus={currentStatus}
                            runningSeconds={runningSeconds}
                            isTimerRunning={isLive}
                            tokensUsed={tokensUsed}
                            statusLabel={isLive ? 'Work in Progress' : isFinished ? 'Completed' : undefined}
                            onClick={() => onViewLogs(ticketNumber)}
                            action={
                                <span
                                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide border shadow-sm inline-flex items-center gap-1 ${
                                        isLive ? 'bg-blue-300 text-white border-blue-300' : 'bg-slate-400 text-white border-slate-400 opacity-60'
                                    }`}
                                >
                                    {isLive ? (
                                        'In Progress'
                                    ) : (
                                        <>
                                            <Check className="w-3 h-3" />
                                            {isFinished ? 'Completed' : 'NA'}
                                        </>
                                    )}
                                </span>
                            }
                        />
                        <p className="text-[10px] text-slate-400 m-0">Click the card to view the full agent log.</p>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-2 rounded-none">
                <button
                    type="button"
                    disabled={!ticketNumber}
                    onClick={() => onViewLogs(ticketNumber)}
                    className="bg-white border border-blue-200 text-[#011A80] px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <ScrollText className="w-3.5 h-3.5" /> View Logs
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-[#011A80] text-white px-6 py-2 rounded-full text-xs font-bold shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                >
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default TicketSnapshotModal;
