import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { Upload, Download, ChevronDown, FileSpreadsheet, FileCheck, Users, Loader2 } from 'lucide-react';
import { useUploadShiftRoster, useDownloadRosterFile } from '../../../hooks';

interface RosterActionsProps {
    onUpload?: (file: File) => void;
    onDownloadRoster?: () => void;
    onDownloadSampleRoster?: () => void;
}

export const RosterActions = ({ onUpload, onDownloadRoster, onDownloadSampleRoster }: RosterActionsProps) => {
    const [isRosterOpen, setIsRosterOpen] = useState(false);
    const downloadButtonRef = useRef<HTMLButtonElement>(null);
    const rosterMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rosterCoords, setRosterCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const uploadMutation = useUploadShiftRoster();
    const downloadMutation = useDownloadRosterFile();

    const handleUploadClick = () => {
        if (uploadMutation.isPending) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const selectedFile = files[0];
            if (onUpload) {
                onUpload(selectedFile);
            } else {
                uploadMutation.mutate(selectedFile);
            }
            e.target.value = '';
        }
    };

    const handleDownloadRoster = () => {
        setIsRosterOpen(false);
        if (onDownloadRoster) {
            onDownloadRoster();
        } else {
            downloadMutation.mutate('actual');
        }
    };

    const handleDownloadSampleRoster = () => {
        setIsRosterOpen(false);
        if (onDownloadSampleRoster) {
            onDownloadSampleRoster();
        } else {
            downloadMutation.mutate('template');
        }
    };

    const updateRosterPosition = () => {
        if (downloadButtonRef.current) {
            const rect = downloadButtonRef.current.getBoundingClientRect();
            const portalContainer = getPortalContainer();
            const portalRect = portalContainer.getBoundingClientRect();

            setRosterCoords({
                top: rect.bottom - portalRect.top + portalContainer.scrollTop + 6,
                left: rect.right - portalRect.left + portalContainer.scrollLeft,
            });
        }
    };

    useEffect(() => {
        if (isRosterOpen) {
            updateRosterPosition();

            const handleOutsideClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                if (!target.isConnected) return;
                if (downloadButtonRef.current?.contains(target) || rosterMenuRef.current?.contains(target)) {
                    return;
                }
                setIsRosterOpen(false);
            };

            window.addEventListener('resize', updateRosterPosition);
            document.addEventListener('mousedown', handleOutsideClick);

            return () => {
                window.removeEventListener('resize', updateRosterPosition);
                document.removeEventListener('mousedown', handleOutsideClick);
            };
        }
    }, [isRosterOpen]);

    return (
        <div className="inline-flex items-center gap-1.5 bg-slate-50/90 backdrop-blur-xs p-1 rounded-xl border border-slate-200/90 shadow-2xs">
            <style>{`
                @keyframes popoverIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateX(-100%) translateY(-0.25rem);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateX(-100%) translateY(0);
                    }
                }
                .animate-popover {
                    animation: popoverIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }
            `}</style>

            {/* Informational Roster Section Label (Non-clickable) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 select-none pointer-events-none">
                <Users size={14} className="text-blue-600 shrink-0" />
                <span className="text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-600">Roster</span>
                <span className="text-slate-300 font-light ml-0.5">|</span>
            </div>

            {/* Hidden Excel file input */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />

            {/* Upload Button */}
            <button
                onClick={handleUploadClick}
                disabled={uploadMutation.isPending}
                className="group px-2.5 py-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] focus:outline-none"
                title="Upload Roster Excel File"
            >
                {uploadMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin text-blue-600" />
                ) : (
                    <Upload size={13} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                )}
                <span>{uploadMutation.isPending ? 'Uploading...' : 'Upload'}</span>
            </button>

            {/* Roster Download Dropdown */}
            <div className="relative">
                <button
                    ref={downloadButtonRef}
                    onClick={() => setIsRosterOpen(!isRosterOpen)}
                    disabled={downloadMutation.isPending}
                    className={`group px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] focus:outline-none ${
                        isRosterOpen
                            ? 'border-blue-500/40 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10 shadow-xs'
                            : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                    }`}
                    title="Download Roster Options"
                >
                    {downloadMutation.isPending ? (
                        <Loader2 size={13} className="animate-spin text-blue-600" />
                    ) : (
                        <Download size={13} className={isRosterOpen ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600 transition-colors'} />
                    )}
                    <span>{downloadMutation.isPending ? 'Downloading...' : 'Download'}</span>
                    <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${isRosterOpen ? 'rotate-180 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                </button>

                {isRosterOpen &&
                    createPortal(
                        <div
                            ref={rosterMenuRef}
                            style={{
                                top: rosterCoords.top,
                                left: rosterCoords.left,
                            }}
                            className="absolute w-60 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl py-1.5 z-[9999] animate-popover ring-1 ring-slate-900/5"
                        >
                            <div className="px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between select-none">
                                <span>Roster Downloads</span>
                                <span className="text-[0.5625rem] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100/80">.xlsx</span>
                            </div>

                            <div className="p-1 space-y-1">
                                <button
                                    onClick={handleDownloadRoster}
                                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50/90 border border-transparent hover:border-slate-200/60 flex items-center gap-2.5 transition-all cursor-pointer group"
                                >
                                    <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                                        <FileSpreadsheet size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Download Roster</span>
                                        <span className="text-[0.625rem] text-slate-400 font-normal">Export active roster schedule</span>
                                    </div>
                                </button>

                                <button
                                    onClick={handleDownloadSampleRoster}
                                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50/90 border border-transparent hover:border-slate-200/60 flex items-center gap-2.5 transition-all cursor-pointer group"
                                >
                                    <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                                        <FileCheck size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Download Sample Roster</span>
                                        <span className="text-[0.625rem] text-slate-400 font-normal">Download blank template structure</span>
                                    </div>
                                </button>
                            </div>
                        </div>,
                        getPortalContainer(),
                    )}
            </div>
        </div>
    );
};

export default RosterActions;
