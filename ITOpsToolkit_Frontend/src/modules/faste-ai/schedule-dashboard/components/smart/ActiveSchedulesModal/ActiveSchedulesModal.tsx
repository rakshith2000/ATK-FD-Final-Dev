import { Loader2, Download, Pause, X } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { useActiveSchedulesLogs } from '../../../hooks/useActiveSchedulesLogs';
import { agentColorClass, agentLabel, formatLog, ticketId } from '../../../utils/activeSchedulesHelpers';
import type { ScheduleTask } from '../../../types/types';

export interface ActiveSchedulesModalProps {
    isOpen: boolean;
    tasks: ScheduleTask[];
    onClose: () => void;
}

export default function ActiveSchedulesModal({ isOpen, tasks, onClose }: ActiveSchedulesModalProps) {
    const {
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
    } = useActiveSchedulesLogs(isOpen, tasks, onClose);

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            size={triggered.length === 0 ? 'md' : '6xl'}
            closeButtonClassName="hidden"
            className={`p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl flex flex-col w-full ${
                triggered.length === 0 ? '' : 'h-[82vh] max-h-[85vh]'
            }`}
        >
            {triggered.length === 0 ? (
                <Modal.Body className="p-8 mb-0 flex flex-col items-center justify-center text-center h-full">
                    <div className="rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#011A80] dark:text-blue-400 flex items-center justify-center mb-3 text-xl p-3">
                        <Pause size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[#011A80] dark:text-white mb-1">No Active Schedules</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">No scheduled tasks are currently running.</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#011A80] hover:bg-[#011A80]/90 rounded-lg transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </Modal.Body>
            ) : (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="bg-[#011A80] px-5 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
                            <h2 className="font-bold text-sm sm:text-base text-white">Active Schedules — Live Execution Logs</h2>
                            <span className="bg-white/20 text-white rounded-full px-2.5 py-0.5 text-xs font-bold">{triggered.length} running</span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <X size={15} /> Close
                        </button>
                    </div>

                    <div className="flex flex-1 min-h-0 overflow-hidden">
                        <div className="w-60 border-r border-gray-200 dark:border-gray-800 overflow-y-auto shrink-0 bg-slate-50/70 dark:bg-gray-900/50">
                            {triggered.map((task) => {
                                const tid = ticketId(task);
                                const isActive = task._id === selectedId;
                                const ws = wsState[task._id];
                                const count = (liveLogs[task._id] || []).length;
                                const statusBg = ws === 'connected' ? 'bg-emerald-500' : ws === 'disconnected' ? 'bg-red-500' : 'bg-amber-500';

                                return (
                                    <div
                                        key={task._id}
                                        onClick={() => setSelectedId(task._id)}
                                        className={`p-3 border-b border-gray-200 dark:border-gray-800 cursor-pointer transition-colors ${
                                            isActive ? 'bg-[#011A80] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                                        }`}
                                    >
                                        <div className="font-bold text-xs mb-1 truncate">{task.taskName}</div>
                                        <div className={`text-[11px] capitalize mb-1.5 line-clamp-1 ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {task.tower} · {task.sop}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                            <code
                                                className={`px-1.5 py-0.5 rounded font-mono ${
                                                    isActive ? 'bg-white/15 text-white/90' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                {tid}
                                            </code>
                                            <span className="flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusBg}`} />
                                                <span className={isActive ? 'text-white/80' : 'text-gray-400'}>
                                                    {ws === 'connected' ? 'live' : ws === 'disconnected' ? 'offline' : 'connecting'}
                                                </span>
                                            </span>
                                            <span className={isActive ? 'text-white/60' : 'text-gray-400'}>{count} entries</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {selectedTask ? (
                            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-5 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-slate-100/70 dark:bg-gray-800/50 flex items-center justify-between shrink-0 gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="font-bold text-xs text-[#011A80] dark:text-white truncate">{selectedTask.taskName}</span>
                                        <code className="text-[10px] bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono shrink-0">
                                            {ticketId(selectedTask)}
                                        </code>
                                        {selectedWsState === 'connected' && (
                                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold tracking-wider shrink-0">● LIVE</span>
                                        )}
                                        {selectedWsState === 'disconnected' && <span className="text-[9px] text-red-600 dark:text-red-400 font-bold shrink-0">● DISCONNECTED</span>}
                                        {selectedWsState === 'connecting' && (
                                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold shrink-0">● CONNECTING…</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDownload(selectedTask)}
                                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
                                    >
                                        <Download size={13} /> Download Logs
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-slate-50/50 dark:bg-gray-950/50 space-y-1.5">
                                    {visibleLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                                            <Loader2 className="animate-spin text-[#011A80] dark:text-blue-400" size={20} />
                                            <span className="text-xs">
                                                {selectedWsState === 'connecting' ? 'Connecting to live agent stream...' : 'Waiting for the next agent update...'}
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            {visibleLogs.map((log, idx) => {
                                                const agent = log.agent_name || log.source || 'system';
                                                const time = log.time ? new Date(log.time).toLocaleTimeString() : '';
                                                const msg = formatLog(log);
                                                if (!msg) return null;
                                                const isOk = /task execution completed|finished with status:\s*taskstatus\.completed/i.test(msg);
                                                const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-100/60 dark:bg-gray-800/40';

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex gap-3 items-start py-1.5 px-2.5 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-colors ${rowBg}`}
                                                    >
                                                        <span className="text-[10px] text-gray-400 w-16 shrink-0 mt-0.5 font-sans">{time}</span>
                                                        <span className={`text-xs w-36 shrink-0 font-bold truncate ${agentColorClass(log.source || log.agent_name)}`}>{agent}</span>
                                                        <span
                                                            className={`flex-1 text-xs leading-relaxed break-words whitespace-pre-wrap ${
                                                                isOk ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-800 dark:text-slate-200'
                                                            }`}
                                                        >
                                                            {msg}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {showWorkingLoader && (
                                                <div className="flex gap-3 items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-2 px-2.5 rounded-md shadow-xs">
                                                    <span className="w-16 text-[10px] text-gray-400 font-sans">live</span>
                                                    <span className={`w-36 text-xs font-bold truncate ${agentColorClass(latestAgent)}`}>{agentLabel(latestAgent)}</span>
                                                    <span className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                        <Loader2 className="animate-spin text-[#011A80] dark:text-blue-400" size={13} />
                                                        Waiting for the next agent update...
                                                    </span>
                                                </div>
                                            )}

                                            {isTerminalLog && (
                                                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                                    ✓ Task completed — closing in 3 seconds
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">Select a task to view logs</div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}
