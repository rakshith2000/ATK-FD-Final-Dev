import type React from 'react';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import { getSnowFieldValueOrDisplay } from '@/shared/modules/servicenow/utils/servicenow-field-helpers';
import { getMimIncidentDetails } from '@/modules/major-incident-management/utils/get-mim-incident-details';
import { useTicketFormQueries } from '@/shared/modules/servicenow/hooks/useTicketFormQueries';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import { RefreshCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface IncidentStepsTakenTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const IncidentStepsTakenTab: React.FC<IncidentStepsTakenTabProps> = ({ mimData, snowIncident }) => {
    const incDetails = getMimIncidentDetails(mimData);

    const closeNotes = getSnowFieldValueOrDisplay(snowIncident?.close_notes) || incDetails?.close_notes || '';

    const fallbackWorkNotes = getSnowFieldValueOrDisplay(snowIncident?.work_notes) || incDetails?.work_notes || '';

    const { ticketJournalEntries, journalEntriesList } = useTicketFormQueries({
        shouldLoadJournalEntries: true,
        enableAuditEntries: false,
        ticketType: 'incident',
        ticketId: snowIncident?.sys_id?.value ?? '',
    });

    const hasJournalEntries = journalEntriesList && journalEntriesList.length > 0;

    return (
        <div className="w-full h-full min-h-0 flex flex-col gap-3 p-1.5 overflow-y-auto">
            {/* Resolution Summary & Notes Section */}
            <div className="flex bg-white flex-col gap-1.5 p-0.5 rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                <TitleWithArraow title="Resolution Summary & Notes" className="text-xs w-max" />
                <div className="px-3 py-1">
                    {closeNotes ? <RenderMarkdown text={closeNotes} /> : <div className="text-xs text-gray-400">Resolution notes are not available yet.</div>}
                </div>
            </div>

            {/* Resolution Activities & Work Notes Section */}
            <div className="flex bg-white flex-col gap-1.5 p-0.5 rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                <TitleWithArraow title="Resolution Activities & Work Notes" className="text-xs w-max" />
                <div className="flex flex-col gap-2 p-2">
                    {ticketJournalEntries.isLoading && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <LoadingPlaceholder />
                        </div>
                    )}

                    {ticketJournalEntries.isError && (
                        <div className="flex items-center gap-1.5 text-xs text-red-500">
                            <span>{ticketJournalEntries.error?.message ?? 'Failed to load work notes'}</span>
                            <button type="button" onClick={() => ticketJournalEntries.refetch()} className="flex items-center gap-0.5 text-blue-500 underline cursor-pointer">
                                <RefreshCw size={10} /> Retry
                            </button>
                        </div>
                    )}

                    {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && hasJournalEntries && (
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                            {journalEntriesList.map((entry, index) => {
                                const isJournal = entry.type === 'journal';
                                const element = 'element' in entry ? entry.element : undefined;
                                const noteValue = 'value' in entry ? entry.value : undefined;
                                const isWorkNote = isJournal && element === 'work_notes';
                                const isCloseNote = isJournal && (element === 'close_notes' || element === 'resolution_notes');

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
                                            'flex flex-col gap-1 rounded border p-2 text-xs leading-relaxed shadow-2xs',
                                            isJournal
                                                ? isWorkNote
                                                    ? 'border-amber-100 bg-amber-50/30 text-amber-950'
                                                    : isCloseNote
                                                      ? 'border-emerald-100 bg-emerald-50/30 text-emerald-950'
                                                      : 'border-slate-100 bg-slate-50/30 text-slate-900'
                                                : 'border-blue-100 bg-blue-50/30 text-blue-950',
                                        )}
                                    >
                                        <div className="flex items-center justify-between border-b pb-1 mb-1 border-current/10">
                                            <span className="font-semibold text-gray-800">{entry.sys_created_by}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[0.6rem] text-gray-600">{formattedTime}</span>
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
                                                    {element ? element.replace('_', ' ') : entry.type}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-xs font-sans">
                                            {noteValue ? (
                                                <RenderMarkdown text={noteValue} />
                                            ) : 'fieldname' in entry ? (
                                                <div className="text-gray-700">
                                                    Changed <span className="font-semibold text-blue-800">{entry.fieldname}</span> from{' '}
                                                    <span className="font-semibold text-red-600/80">{entry.oldvalue || 'none'}</span> to{' '}
                                                    <span className="font-semibold text-green-600">{entry.newvalue || 'none'}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && !hasJournalEntries && fallbackWorkNotes && (
                        <div className="p-2.5 rounded border border-slate-200/80 bg-slate-50/40 text-xs text-slate-800 leading-relaxed font-sans">
                            <RenderMarkdown text={fallbackWorkNotes} />
                        </div>
                    )}

                    {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && !hasJournalEntries && !fallbackWorkNotes && (
                        <div className="text-xs text-gray-400">No work notes found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IncidentStepsTakenTab;
