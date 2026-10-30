import React from 'react';
import { ExternalLink, Coins, Timer } from 'lucide-react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { formatDuration, resolveIncidentValue } from '../../../utils/activeTicketHelpers';

export interface ActiveTicketCardIncident {
    number: string;
    created_on?: string;
    resolved?: boolean | string;
    [key: string]: unknown;
}

interface ActiveTicketCardProps {
    incident: ActiveTicketCardIncident;
    progress: number;
    currentStatus: string;
    runningSeconds?: number | null;
    isTimerRunning?: boolean;
    tokensUsed?: number | null;
    statusLabel?: string;
    action?: React.ReactNode;
    footerNote?: React.ReactNode;
    onClick?: () => void;
    className?: ClassNameValue;
}

export const ActiveTicketCard: React.FC<ActiveTicketCardProps> = ({
    incident,
    progress,
    currentStatus,
    runningSeconds,
    isTimerRunning = false,
    tokensUsed,
    statusLabel,
    action,
    footerNote,
    onClick,
    className,
}) => {
    const record = incident as Record<string, unknown>;
    const assignedTo = resolveIncidentValue(record, ['assigned_to', 'assignedto', 'assignee']);
    const assignmentGroup = resolveIncidentValue(record, ['assignment_group', 'assignmentgroup']);
    const configItem = resolveIncidentValue(record, ['cmdb_ci', 'cmdbci', 'configuration_item', 'config_item']);
    const shortDescription = resolveIncidentValue(record, ['short_description', 'shortdescription', 'summary']);
    const description = resolveIncidentValue(record, ['description', 'description_text']);
    const priority = resolveIncidentValue(record, ['priority', 'severity']);
    const isResolved = incident.resolved === 'true' || incident.resolved === true;
    const status = statusLabel ?? (isResolved ? 'Resolved' : progress >= 100 ? 'Completed' : 'Work in Progress');
    const createdOn = incident.created_on ? String(incident.created_on) : '';

    const rows: Array<[string, string, string]> = [
        ['Priority', priority, 'text-slate-700 font-medium'],
        ['Assigned To', assignedTo, 'text-slate-700'],
        ['Assignment Group', assignmentGroup, 'text-slate-700'],
        ['Config Item', configItem, 'text-slate-700'],
        ['Short Description', shortDescription, 'text-slate-600 font-normal'],
        ['Description', description, 'text-slate-600 font-normal'],
    ];

    return (
        <div
            className={twMerge(
                'bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm transition-all overflow-hidden max-w-2xl [box-shadow:inset_0_2px_6px_0_#abc2ff]',
                onClick ? 'hover:shadow-md cursor-pointer' : '',
                className,
            )}
            onClick={onClick}
        >
            <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 flex-1">
                <div className="md:col-span-7 flex flex-col gap-0.5 text-[11px]">
                    <div className="flex items-center">
                        <span className="w-2/5 text-slate-500 font-medium">Incident Number</span>
                        <span className="w-3/5 text-[#011A80] font-bold">{incident.number}</span>
                    </div>
                    {rows.map(([label, value, valueClass]) => (
                        <div key={label} className="flex items-center">
                            <span className="w-2/5 text-slate-500 font-medium">{label}</span>
                            <span className={`w-3/5 truncate ${valueClass}`} title={value}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="md:col-span-5 md:border-l md:border-slate-100 md:pl-2.5 flex flex-col justify-between pt-1 md:pt-0">
                    <div>
                        <div className="mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block">Current Status</span>
                            <span className="text-xs font-bold text-slate-800">{status}</span>
                        </div>
                        <div className="mb-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block">Steps Under Progress</span>
                            <p className="text-[10px] text-slate-600 m-0 leading-snug font-medium line-clamp-1">{currentStatus}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <div className="truncate pr-1">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase">Assignee Target</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate block">{assignedTo}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-[#011A80] shrink-0" />
                    </div>
                </div>
            </div>

            <div className="bg-[#E3F2FD] border-t border-blue-100 px-3 py-1.5 mt-auto">
                <div className="flex items-center justify-between gap-2">
                    <div className="w-2/3 bg-blue-200/60 h-3.5 rounded-full relative overflow-hidden flex items-center shadow-inner">
                        <div className="bg-linear-to-r from-blue-500 to-[#011A80] h-full transition-all duration-700 rounded-full" style={{ width: `${Math.max(progress, 5)}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#011A80] select-none">{Math.round(progress)}%</span>
                    </div>

                    {action}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 pt-1 border-t border-blue-200/40 text-[9px] text-slate-500">
                    <div>
                        Receiving Date: <span className="text-slate-700 font-medium">{createdOn ? createdOn.substring(0, 10) : 'NA'}</span>
                    </div>
                    <div className="text-right flex items-center justify-end gap-1">
                        <Timer className={`w-2.5 h-2.5 shrink-0 ${isTimerRunning ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
                        Running Time:
                        <span className={`font-bold tabular-nums ${isTimerRunning ? 'text-emerald-700' : 'text-slate-700'}`}>{formatDuration(runningSeconds)}</span>
                    </div>
                    <div>
                        Receiving Time: <span className="text-slate-700 font-medium">{createdOn ? createdOn.substring(11, 19) : 'NA'}</span>
                    </div>
                    <div className="text-right flex items-center justify-end gap-1">
                        <Coins className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        No. of Tokens:
                        <span className="text-slate-700 font-bold tabular-nums">{tokensUsed !== undefined && tokensUsed !== null ? tokensUsed.toLocaleString() : 'NA'}</span>
                    </div>
                    {footerNote ? <div className="col-span-2">{footerNote}</div> : null}
                </div>
            </div>
        </div>
    );
};

export default ActiveTicketCard;
