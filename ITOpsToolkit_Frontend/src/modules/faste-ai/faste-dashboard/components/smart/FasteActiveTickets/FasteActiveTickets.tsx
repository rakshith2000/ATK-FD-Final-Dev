import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Check, Loader2, XCircle } from 'lucide-react';
import { fasteaiFetch, FASTEAI_CORE_BASE, FASTEAI_CORE_WS } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { useLiveTaskLogs } from '../../../hooks/useActiveticket';
import { FasteLogModal } from '../FasteLogModal/FasteLogModal';
import { ActiveTicketCard } from '../../ui/ActiveTicketCard/ActiveTicketCard';
import { reassignAutomationTicket } from '../../../services/patch-ticket';
import {
    downloadLogsAsText,
    extractTicketFieldsFromLogs,
    getCurrentStatus,
    mergeTicketFields,
    normalizeFieldValue,
    TICKET_DETAIL_FIELDS,
} from '../../../utils/activeTicketHelpers';
import { saveTicketSnapshot } from '../../../utils/ticketSnapshotStore';

export interface ExtendedTicket {
    id?: string | number;
    ticket_id?: string | number;
    number: string;
    created_on?: string;
    resolved?: boolean | string;
    escalation_state?: boolean | string;
    dashboard_category?: string;
    ticket_category?: string;
    escalation_category?: string[];
    short_description?: string;
    description?: string;
    assignment_group?: string;
    assigned_to?: string;
    cmdb_ci?: string;
    priority?: string | number;
    [key: string]: unknown;
}

interface LoginDetails {
    currentuserDetails?: {
        name?: string;
        display_name?: string;
        user_name?: string;
    };
}

interface FasteActiveTicketsProps {
    incidentData: ExtendedTicket[];
    loginUserSysId: string;
    loginDetails: LoginDetails;
}

export const FasteActiveTickets: React.FC<FasteActiveTicketsProps> = ({ incidentData, loginUserSysId, loginDetails }) => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

    const { allReceivedLogs, progress, runningSeconds, isTimerRunning, tokensUsed, completedTickets, wsDisconnected } = useLiveTaskLogs(
        incidentData,
        fasteaiFetch,
        FASTEAI_CORE_BASE,
        FASTEAI_CORE_WS,
    );

    const reassignMutation = useMutation({
        mutationFn: async (incident: ExtendedTicket) => {
            const userInfo = loginDetails?.currentuserDetails ?? {};
            const userName = userInfo.name ?? userInfo.display_name ?? userInfo.user_name ?? loginUserSysId;
            const timestamp = new Date().toLocaleString();

            const workNote =
                `FasteAI automation task stopped and ticket reassigned.\n` +
                `Action taken by: ${userName}\n` +
                `Timestamp: ${timestamp}\n` +
                `Note: Automated task was terminated by the user and ticket has been reassigned to ${userName} for manual handling.`;

            const targetId = String(incident.id ?? incident.ticket_id ?? incident.number);

            return reassignAutomationTicket(targetId, incident.number, {
                assignedTo: loginUserSysId,
                workNotes: workNote,
                shortDescription: incident.short_description ?? '',
                description: incident.description ?? '',
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['fasteai-logs'] });
        },
    });

    const getIncidentLogs = (id: string) => allReceivedLogs[id] ?? [];

    const enrichedIncidents = useMemo(
        () => incidentData.map((inc) => mergeTicketFields(inc, extractTicketFieldsFromLogs(allReceivedLogs[inc.number] ?? []))),
        [incidentData, allReceivedLogs],
    );

    const activeIncidents = useMemo(() => enrichedIncidents.filter((inc) => !completedTickets.has(inc.number)), [enrichedIncidents, completedTickets]);

    useEffect(() => {
        for (const incident of enrichedIncidents) {
            if ((progress[incident.number] ?? 0) < 100) continue;
            const fields: Record<string, string> = {};
            for (const field of TICKET_DETAIL_FIELDS) {
                const value = normalizeFieldValue(incident[field]);
                if (value !== 'NA') fields[field] = value;
            }
            saveTicketSnapshot({
                number: incident.number,
                fields,
                runningSeconds: runningSeconds[incident.number] ?? null,
                tokensUsed: tokensUsed[incident.number] ?? null,
                lastStep: getCurrentStatus(allReceivedLogs[incident.number] ?? []),
                completedAt: Date.now(),
            });
        }
    }, [enrichedIncidents, progress, runningSeconds, tokensUsed, allReceivedLogs]);

    if (activeIncidents.length === 0) {
        return (
            <div className="w-full flex flex-col items-center justify-center text-center py-8 bg-white border border-slate-100 rounded-xl shadow-sm max-w-xl mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <h6 className="text-[#011A80] font-bold text-sm">All Tasks Executed Successfully</h6>
                <p className="text-slate-400 text-xs mt-0.5">No pending live automation requests active.</p>
            </div>
        );
    }

    return (
        <div className="w-full p-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeIncidents.map((incident) => {
                    const incidentId = incident.number;
                    const incidentProgress = progress[incidentId] ?? 5;

                    const isCompleted = incidentProgress >= 100;
                    const isMutating = reassignMutation.isPending && reassignMutation.variables?.number === incidentId;
                    const isSuccess = reassignMutation.isSuccess && reassignMutation.variables?.number === incidentId;
                    const isError = reassignMutation.isError && reassignMutation.variables?.number === incidentId;

                    return (
                        <ActiveTicketCard
                            key={incidentId}
                            incident={incident}
                            progress={incidentProgress}
                            currentStatus={getCurrentStatus(getIncidentLogs(incidentId))}
                            runningSeconds={runningSeconds[incidentId] ?? 0}
                            isTimerRunning={Boolean(isTimerRunning[incidentId])}
                            tokensUsed={tokensUsed[incidentId] ?? 0}
                            onClick={() => {
                                setSelectedIncidentId(incidentId);
                                setShowModal(true);
                            }}
                            footerNote={wsDisconnected[incidentId] ? <span className="text-amber-600 font-semibold">Live connection lost — reconnecting...</span> : null}
                            action={
                                <button
                                    type="button"
                                    disabled={isCompleted || isMutating}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        reassignMutation.mutate(incident);
                                    }}
                                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all min-w-[18.75] border shadow-sm inline-flex items-center justify-center gap-1 ${
                                        isCompleted
                                            ? 'bg-slate-400 text-white border-slate-400 opacity-60 cursor-not-allowed'
                                            : isMutating
                                              ? 'bg-blue-300 text-white border-blue-300 cursor-wait'
                                              : isSuccess
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : isError
                                                  ? 'bg-rose-600 text-white border-rose-600'
                                                  : 'bg-[#011A80] text-white border-[#011A80] hover:bg-opacity-90 active:scale-95'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            Completed
                                        </>
                                    ) : isMutating ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Assigning...
                                        </>
                                    ) : isSuccess ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            Assigned
                                        </>
                                    ) : isError ? (
                                        <>
                                            <XCircle className="w-3 h-3" />
                                            Failed
                                        </>
                                    ) : (
                                        'Reassign'
                                    )}
                                </button>
                            }
                        />
                    );
                })}
            </div>

            <FasteLogModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                incidentId={selectedIncidentId ?? ''}
                logs={selectedIncidentId ? getIncidentLogs(selectedIncidentId) : []}
                isDisconnected={selectedIncidentId ? Boolean(wsDisconnected[selectedIncidentId]) : false}
                onDownload={(id) => downloadLogsAsText(id, getIncidentLogs(id))}
            />
        </div>
    );
};
