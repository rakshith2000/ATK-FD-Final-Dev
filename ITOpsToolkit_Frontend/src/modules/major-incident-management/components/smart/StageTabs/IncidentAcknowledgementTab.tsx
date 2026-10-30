import type { MimDataResponse } from '@/modules/major-incident-management/types';
import { getPriorityDotColor, getPriorityTextColor } from '@/modules/major-incident-management/utils/get-priority-colors';
import { getStateDotColor, getStateTextColor } from '@/modules/major-incident-management/utils/get-state-colors';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import { Calendar, RefreshCw, Server, User, Users } from 'lucide-react';
import type React from 'react';
import FieldInfoCard from '../../ui/FieldInfoCard/FieldInfoCard';
import { formatLocalDate } from '@/shared/utils/format-local-date';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { useTicketFormQueries } from '@/shared/modules/servicenow/hooks/useTicketFormQueries';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import { twMerge } from 'tailwind-merge';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import ChatBot from '@/shared/components/smart/ChatBot/ChatBot';
import postTechAssitChatMessage from '@/shared/modules/atk-backend/services/post-tech-assit-chat-message';

interface IncidentAcknowledgementTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const IncidentAcknowledgementTab: React.FC<IncidentAcknowledgementTabProps> = ({ snowIncident, mimData, incidentNumber }) => {
    const { ticketJournalEntries, journalEntriesList } = useTicketFormQueries({
        shouldLoadJournalEntries: true,
        enableAuditEntries: false,
        ticketType: 'incident',
        ticketId: snowIncident?.sys_id?.value ?? '',
    });

    const askMimBotIntialContext = `${mimData?.incident_summary || ''}
                                        <div style="display: none;">
                                            Below is the data for LLM regarding the service now incident and major incident management (mim resposne from api)
                                            <snow_incident_data>
                                            ${JSON.stringify(snowIncident)}
                                            </snow_incident_data>

                                            <mim_data>
                                            ${JSON.stringify(mimData)}
                                            </mim_data>
                                        </div>
                                    `;

    return (
        <div className="w-full min-w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0.5 overflow-auto">
            <div className="lg:col-span-8 w-full h-full min-h-50 flex flex-col gap-2 overflow-auto p-0.5">
                <div className="hidden bg-white rounded-lg border border-slate-200/90 p-1 shadow-xs flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        <FieldInfoCard title="State">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${getStateDotColor(snowIncident?.state?.display_value ?? '')}}`} />
                            <span className={`${getStateTextColor(snowIncident?.state?.display_value ?? '')}`}>{snowIncident?.state?.display_value}</span>
                        </FieldInfoCard>

                        <FieldInfoCard title="Priority">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${getPriorityDotColor(snowIncident?.priority?.value ?? '')}}`} />
                            <span className={`${getPriorityTextColor(snowIncident?.priority?.value ?? '')}`}>{snowIncident?.priority?.display_value}</span>
                        </FieldInfoCard>

                        <FieldInfoCard title="Assignment Group">
                            <span className="text-(--brand-color)">
                                <Users size={13} />
                            </span>
                            <span className="text-(--brand-color)">{snowIncident?.assignment_group?.display_value}</span>
                        </FieldInfoCard>

                        <FieldInfoCard title="Assigned To">
                            <span className="text-(--brand-color)">
                                <User size={13} />
                            </span>
                            <span className="text-(--brand-color)">{snowIncident?.assigned_to?.display_value}</span>
                        </FieldInfoCard>

                        <FieldInfoCard title="Affected CI">
                            <span className="text-(--brand-color)">
                                <Server size={13} />
                            </span>
                            <span className="text-(--brand-color)">{snowIncident?.cmdb_ci?.display_value}</span>
                        </FieldInfoCard>

                        <FieldInfoCard title="Last UpdatedAt">
                            <span className="text-(--brand-color)">
                                <Calendar size={13} />
                            </span>
                            <span className="text-(--brand-color)">{formatLocalDate(snowIncident?.sys_updated_on?.display_value)}</span>
                        </FieldInfoCard>
                    </div>
                </div>
                <div className="flex bg-white flex-col gap-1.5 p-0.5 rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                    <TitleWithArraow title="Incident Summary" className={'text-xs w-max'} />
                    <p className="px-3 py-1">
                        <RenderMarkdown text={mimData?.incident_summary ?? ''} />
                    </p>
                </div>
                <div className="flex flex-col bg-white gap-1.5 p-0.5 rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                    <TitleWithArraow title="Incident Notes" className={'text-xs w-max'} />
                    <div className="flex flex-col gap-2 p-2">
                        {ticketJournalEntries.isLoading && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <LoadingPlaceholder />
                            </div>
                        )}

                        {ticketJournalEntries.isError && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500">
                                <span>{ticketJournalEntries.error?.message ?? 'Failed to load notes'}</span>
                                <button type="button" onClick={() => ticketJournalEntries.refetch()} className="flex items-center gap-0.5 text-blue-500 underline cursor-pointer">
                                    <RefreshCw size={10} /> Retry
                                </button>
                            </div>
                        )}

                        {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && journalEntriesList.length === 0 && (
                            <div className="text-xs text-gray-400">No notes found.</div>
                        )}

                        {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && journalEntriesList.length > 0 && (
                            <>
                                {journalEntriesList.map((entry, index) => {
                                    const isJournal = entry.type === 'journal';
                                    const isWorkNote = isJournal && entry.element === 'work_notes';
                                    const isCloseNote = isJournal && (entry.element === 'close_notes' || entry.element === 'resolution_notes');
                                    const formattedTime = (() => {
                                        try {
                                            const date = new Date(entry.sys_created_on + ' UTC');

                                            if (isNaN(date.getTime())) return entry.sys_created_on;

                                            return date.toLocaleString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                            });
                                        } catch {
                                            return entry.sys_created_on;
                                        }
                                    })();

                                    return (
                                        <div
                                            key={index}
                                            className={twMerge(
                                                'flex flex-col gap-1 rounded border p-2 transition-colors text-[0.65rem] leading-relaxed shadow-xs',
                                                isJournal
                                                    ? isWorkNote
                                                        ? 'border-amber-100 bg-amber-50/30 text-amber-900'
                                                        : isCloseNote
                                                          ? 'border-emerald-100 bg-emerald-50/30 text-emerald-900'
                                                          : 'border-slate-100 bg-slate-50/30 text-slate-900'
                                                    : 'border-blue-100 bg-blue-50/30 text-blue-900',
                                            )}
                                        >
                                            <div className="flex items-center justify-between border-b pb-1 mb-1 border-current/10">
                                                <span className="font-semibold text-gray-800">{entry.sys_created_by}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[0.6rem] text-gray-700">{formattedTime}</span>
                                                    <span
                                                        className={twMerge(
                                                            'rounded px-1 py-0.5 text-[0.55rem] font-medium tracking-wider',
                                                            isJournal
                                                                ? isWorkNote
                                                                    ? 'bg-amber-100/60 text-amber-700'
                                                                    : isCloseNote
                                                                      ? 'bg-emerald-100/60 text-emerald-700'
                                                                      : 'bg-slate-100/60 text-slate-700'
                                                                : 'bg-blue-100/60 text-blue-700',
                                                        )}
                                                    >
                                                        {isJournal ? (isWorkNote ? 'Work Notes' : isCloseNote ? 'Close Notes' : 'Additional Comments') : 'Field Change'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isJournal ? (
                                                <div className="whitespace-pre-wrap truncate text-gray-700">{entry.value}</div>
                                            ) : (
                                                <div className="text-gray-700">
                                                    Changed <span className="font-semibold text-blue-800">{entry.fieldname}</span> from{' '}
                                                    <span className="font-semibold text-red-600/80">{entry.oldvalue || 'none'}</span> to{' '}
                                                    <span className="font-semibold text-green-600">{entry.newvalue || 'none'}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {ticketJournalEntries.hasNextPage && (
                                    <div className="flex flex-col items-center gap-1 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => ticketJournalEntries.fetchNextPage()}
                                            className="text-xs px-4 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                                            disabled={ticketJournalEntries.isFetchingNextPage}
                                        >
                                            {ticketJournalEntries.isFetchingNextPage ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-4 w-full h-full min-h-70 flex flex-col overflow-hidden p-0.5">
                <ShellLayout className="rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 w-full h-full min-h-0 flex flex-col overflow-hidden">
                    <ShellLayout.Header className="shrink-0">
                        <TitleWithArraow title="Ask MIM" className="text-xs" />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="w-full flex-1 min-h-0 overflow-y-auto">
                        <ChatBot
                            key={incidentNumber}
                            title="Ask MIM"
                            placeholder="Enter your text here..."
                            loadingMessage="Setting up MIM Assist..."
                            systemMessage={askMimBotIntialContext}
                            sendMessage={({ conversation, userMessage }) =>
                                postTechAssitChatMessage({
                                    conversation,
                                    query: userMessage,
                                })
                            }
                        />
                    </ShellLayout.Body>
                </ShellLayout>
            </div>
        </div>
    );
};

export default IncidentAcknowledgementTab;
