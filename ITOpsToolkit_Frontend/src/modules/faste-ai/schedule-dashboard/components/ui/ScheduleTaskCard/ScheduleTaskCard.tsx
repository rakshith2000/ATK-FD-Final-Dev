import React from 'react';
import { Pencil, Play, Trash2, Download, LayoutGrid, Terminal, Database, Network, Minus, FileText } from 'lucide-react';
import { getRecurrenceLabel, calculateNextRun, getLastRunLabel, hasExecutionReport } from '../../../utils/scheduleHelpers';
import type { ScheduleTask, CiItem } from '../../../types/types';

interface ScheduleTaskCardProps {
    item: ScheduleTask;
    cis: CiItem[];
    deletingId: string | null;
    onEdit: (item: ScheduleTask) => void;
    onRun: (item: ScheduleTask) => void;
    onDelete: (id: string) => void;
    onViewReport: (item: ScheduleTask) => void;
    onDownloadLogs: (item: ScheduleTask) => void;
}

const towerIcons: Record<string, React.ReactNode> = {
    windows: <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />,
    linux: <Terminal className="w-3.5 h-3.5 text-slate-600" />,
    database: <Database className="w-3.5 h-3.5 text-slate-600" />,
    network: <Network className="w-3.5 h-3.5 text-slate-600" />,
};

const statusColors: Record<string, string> = {
    Completed: 'text-green-600 font-bold',
    Failed: 'text-red-600 font-bold',
    Awaiting: 'text-amber-600 font-bold',
    Scheduled: 'text-blue-600 font-bold',
    Triggered: 'text-purple-600 font-bold',
};

export const ScheduleTaskCard: React.FC<ScheduleTaskCardProps> = ({ item, cis, deletingId, onEdit, onRun, onDelete, onViewReport, onDownloadLogs }) => {
    const isEditable = item.status === 'Scheduled' || item.status === 'Awaiting';

    const getCiNames = (ciItems: Array<string | { name?: string; sys_id?: string | number }>) => {
        if (!ciItems?.length) return <Minus className="text-slate-300 w-3 h-3 inline-block" />;

        const ciNameById = new Map(
            cis.map((ci) => [
                String(ci.sys_id || '')
                    .trim()
                    .toLowerCase(),
                ci.name,
            ]),
        );

        const mappedNames = ciItems.map((ci) => {
            if (typeof ci === 'object' && ci !== null) {
                if (ci.name?.trim()) return ci.name;
                const id = String(ci.sys_id || '')
                    .trim()
                    .toLowerCase();
                return ciNameById.get(id) || ci.sys_id || '—';
            }
            const id = String(ci || '').trim();
            if (!id) return '—';
            return ciNameById.get(id.toLowerCase()) || id;
        });

        return mappedNames.join(', ');
    };

    const recurrence = getRecurrenceLabel(item.schedulePeriod);
    const nextRun = calculateNextRun(item.schedulePeriod, item.status);
    const lastRun = getLastRunLabel(item.schedulePeriod);
    const hasReport = hasExecutionReport(item);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full transition-all hover:shadow-sm overflow-hidden">
            <div>
                <div className="flex justify-between items-center bg-[#DEEEFF] gap-2 px-3 py-2 mb-2">
                    <h6 className="font-extrabold text-blue-950 text-xs tracking-tight truncate max-w-[85%]" title={item.taskName}>
                        {item.taskName}
                    </h6>
                    <div className="text-slate-500 shrink-0">{towerIcons[item.tower?.toLowerCase()] || <Terminal className="w-3.5 h-3.5" />}</div>
                </div>

                <div className="px-3 space-y-1.5 mb-2.5">
                    {[
                        ['Tower', item.tower],
                        ['SOP', item.sop],
                        ['Report Type', item.reportType],
                        ['Report Format', item.reportFormat?.toUpperCase()],
                        ['Schedule', recurrence],
                        ['Next Run', nextRun],
                        ...(lastRun !== '—' ? [['Last Run', lastRun]] : []),
                        ['CI Items', getCiNames(item.ciItems)],
                        ['Ticket Required', item.ticketRequired ? 'Yes' : 'No'],
                    ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between items-start text-[11px] gap-2">
                            <span className="text-slate-400 font-medium min-w-20">{label as string}</span>
                            <span className="text-right font-semibold text-(--brand-title-primary-color) text-[11px] break-all capitalize line-clamp-2 flex items-center justify-end">
                                {value}
                            </span>
                        </div>
                    ))}

                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-400 font-medium">Status</span>
                        <span className={`text-right ${statusColors[item.status] || 'text-slate-500'}`}>{item.status}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-1.5 items-center mt-auto mx-3 pb-3 pt-2 border-t border-slate-100">
                {item.status !== 'Completed' ? (
                    <>
                        {isEditable && (
                            <button
                                onClick={() => onEdit(item)}
                                className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                                <Pencil size={10} /> Edit
                            </button>
                        )}
                        <button
                            onClick={() => onRun(item)}
                            className="flex-1 flex items-center justify-center gap-1 bg-blue-950 hover:bg-blue-900 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                        >
                            <Play size={9} className="fill-current" /> Run
                        </button>
                        {hasReport && (
                            <button
                                onClick={() => onViewReport(item)}
                                className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                title="View Latest Report"
                            >
                                <FileText size={10} /> Report
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(item._id)}
                            disabled={deletingId === item._id}
                            className="shrink-0 flex items-center justify-center border border-red-200 hover:bg-red-50 text-red-600 p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                        >
                            {deletingId === item._id ? (
                                <div className="w-2.5 h-2.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Trash2 size={12} />
                            )}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onViewReport(item)}
                            className="flex-1 bg-(--brand-title-primary-color) text-white font-black text-[11px] py-1.5 rounded-lg shadow-xs transition-colors active:scale-95 cursor-pointer"
                        >
                            View Report
                        </button>
                        <button
                            onClick={() => onDownloadLogs(item)}
                            title="Download Report / Logs"
                            className="shrink-0 border border-slate-200 bg-white p-1.5 rounded-lg text-emerald-600 hover:bg-slate-50 shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <Download size={13} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
