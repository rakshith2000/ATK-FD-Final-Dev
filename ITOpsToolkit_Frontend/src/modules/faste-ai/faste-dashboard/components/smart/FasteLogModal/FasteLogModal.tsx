import React from 'react';
import { Terminal, Clock, Download, AlertCircle, Database, Bot, BookOpen, Shield, Cpu, Settings, User } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import type { LogMessage } from '@/modules/faste-ai/schedule-dashboard/types/types';

export type LogItem = LogMessage;

interface FasteLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    incidentId: string;
    logs: LogItem[];
    isDisconnected: boolean;
    onDownload: (id: string) => void;
}

export const FasteLogModal: React.FC<FasteLogModalProps> = ({ isOpen, onClose, incidentId, logs, isDisconnected, onDownload }) => {
    const getAgentIcon = (source?: string) => {
        const norm = source?.toLowerCase().replace(/\s+/g, '_');
        switch (norm) {
            case 'servicenow_agent':
                return <Database className="w-3.5 h-3.5 text-slate-500 inline mr-1" />;
            case 'master_agent':
                return <Bot className="w-3.5 h-3.5 text-blue-600 inline mr-1" />;
            case 'knowledge_agent':
                return <BookOpen className="w-3.5 h-3.5 text-emerald-500 inline mr-1" />;
            case 'security_agent':
                return <Shield className="w-3.5 h-3.5 text-rose-500 inline mr-1" />;
            case 'windows_agent':
                return <Cpu className="w-3.5 h-3.5 text-sky-500 inline mr-1" />;
            case 'linux_agent':
                return <Terminal className="w-3.5 h-3.5 text-amber-500 inline mr-1" />;
            case 'system':
                return <Settings className="w-3.5 h-3.5 text-purple-500 inline mr-1" />;
            default:
                return <User className="w-3.5 h-3.5 text-gray-500 inline mr-1" />;
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose} size="3xl" className="p-0 overflow-hidden ">
            <Modal.Header className="bg-[#011A80] text-white px-6 py-4 flex justify-between items-center overflow-hidden">
                <h3 className="text-base font-bold flex items-center gap-2 m-0 text-white">
                    <Terminal className="w-5 h-5 text-white" /> FasteAI Agent Track Log — <span className="font-normal opacity-90">{incidentId}</span>
                </h3>
            </Modal.Header>

            <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-[#011A80] font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Telemetry Pipeline Live Sync Enabled</span>
                </div>
                {logs.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onDownload(incidentId)}
                        className="bg-white border border-blue-200 text-[#011A80] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                        <Download className="w-3.5 h-3.5" /> Dump Report
                    </button>
                )}
            </div>

            <Modal.Body className="p-6 max-h-[60vh] overflow-y-auto space-y-4 mb-0">
                {isDisconnected ? (
                    <div className="text-center py-8">
                        <div className="bg-amber-50 inline-block p-3 rounded-full text-amber-600 mb-2">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h6 className="text-slate-800 font-bold text-sm">Websocket Pipe Terminated</h6>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="bg-slate-100 inline-block p-3 rounded-full text-slate-400 mb-2">
                            <Terminal className="w-8 h-8" />
                        </div>
                        <h6 className="text-slate-800 font-bold text-sm">No Logs Currently Available</h6>
                        <p className="text-slate-400 text-xs max-w-xs mx-auto mt-1">This task hasn't produced any log entries yet.</p>
                    </div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="space-y-1 w-full overflow-hidden">
                            <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                <span className="flex items-center">
                                    {getAgentIcon(log.source)} {log.source || 'Faste Agent'}
                                </span>
                                <span>{log.time ? new Date(log.time).toLocaleTimeString() : ''}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-wrap wrap-break-words break-all font-mono leading-relaxed shadow-sm max-w-full overflow-x-auto">
                                {log.content?.text || log.message || JSON.stringify(log)}
                            </div>
                        </div>
                    ))
                )}
            </Modal.Body>

            <Modal.Footer className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end rounded-none">
                <button type="button" onClick={onClose} className="bg-[#011A80] text-white px-6 py-2 rounded-full text-xs font-bold shadow-sm hover:opacity-95 transition-opacity">
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default FasteLogModal;
