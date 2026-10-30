import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { Paperclip, Upload, Download, ChevronDown, Loader2 } from 'lucide-react';
import { useUploadSnowAttachmentMutation } from '../../hooks/useUploadSnowAttachmentMutation';
import { useSnowAttachmentsQuery } from '../../hooks/useSnowAttachmentsQuery';
import Modal from '@/shared/components/ui/Modal/Modal';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import SnowAttachmentManager from '../SnowAttachmentManager/SnowAttachmentManager';
import { twMerge } from 'tailwind-merge';
import type { SnowTableName } from '../../types/ticket';

interface SnowTicketAttachmentActionsProps {
    tableName: SnowTableName;
    tableSysId: string;
    title?: string;
    className?: string;
}

export const SnowTicketAttachmentActions = ({ tableName, tableSysId, title = 'ServiceNow Attachment Manager', className = '' }: SnowTicketAttachmentActionsProps) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const attachmentsQuery = useSnowAttachmentsQuery({ tableName, tableSysId });
    const uploadMutation = useUploadSnowAttachmentMutation();

    const attachmentCount = attachmentsQuery.data?.length ?? 0;

    const handleUploadSelectClick = () => {
        setIsPopoverOpen(false);
        if (uploadMutation.isPending) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const selectedFile = files[0];
            uploadMutation.mutate({ tableName, tableSysId, file: selectedFile });
            e.target.value = '';
        }
    };

    const handleOpenDownloadModal = () => {
        setIsPopoverOpen(false);
        setIsModalOpen(true);
    };

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const portalContainer = getPortalContainer();
            const portalRect = portalContainer.getBoundingClientRect();

            setCoords({
                top: rect.bottom - portalRect.top + portalContainer.scrollTop + 6,
                left: rect.right - portalRect.left + portalContainer.scrollLeft,
            });
        }
    };

    useEffect(() => {
        if (isPopoverOpen) {
            updatePosition();

            const handleOutsideClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                if (!target.isConnected) return;
                if (buttonRef.current?.contains(target) || popoverMenuRef.current?.contains(target)) {
                    return;
                }
                setIsPopoverOpen(false);
            };

            window.addEventListener('resize', updatePosition);
            document.addEventListener('mousedown', handleOutsideClick);

            return () => {
                window.removeEventListener('resize', updatePosition);
                document.removeEventListener('mousedown', handleOutsideClick);
            };
        }
    }, [isPopoverOpen]);

    return (
        <>
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

            {/* Hidden File Input */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {/* Standalone Attachments Dropdown Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                disabled={uploadMutation.isPending || attachmentsQuery.isLoading}
                className={twMerge(
                    'group px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed',
                    isPopoverOpen
                        ? 'border-blue-500/40 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10 shadow-xs'
                        : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700',
                    className,
                )}
                title="Attachment Options"
            >
                {uploadMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
                ) : (
                    <Paperclip size={13} className={isPopoverOpen ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600 transition-colors shrink-0'} />
                )}
                <span>{uploadMutation.isPending ? 'Uploading...' : 'Attachments'}</span>

                {/* Count Badge */}
                <span className="ml-0.5 px-1.5 py-0.2 text-[0.625rem] font-extrabold rounded-full bg-blue-100/90 text-blue-700 border border-blue-200/60 flex items-center justify-center min-w-5">
                    {attachmentsQuery.isLoading ? <Loader2 size={10} className="animate-spin text-blue-700 shrink-0" /> : attachmentCount}
                </span>

                <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
            </button>

            {/* Popover Menu */}
            {isPopoverOpen &&
                createPortal(
                    <div
                        ref={popoverMenuRef}
                        style={{
                            top: coords.top,
                            left: coords.left,
                        }}
                        className="absolute w-64 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl py-1.5 z-9999 animate-popover ring-1 ring-slate-900/5"
                    >
                        <div className="px-3 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-(--brand-title-primary-color) border-b border-(--brand-border-color) flex items-center justify-between select-none">
                            <span>Attachment Actions</span>
                            <span className="text-[0.5625rem] font-semibold bg-blue-50 text-(--brand-title-primary-color) px-1.5 py-0.5 rounded border border-blue-100/80">
                                {attachmentCount} Files
                            </span>
                        </div>

                        <div className="p-1 space-y-1">
                            {/* Option 1: Upload File */}
                            <button
                                onClick={handleUploadSelectClick}
                                disabled={uploadMutation.isPending}
                                className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50/90 border border-transparent hover:border-slate-200/60 flex items-center gap-2.5 transition-all cursor-pointer group disabled:opacity-60"
                            >
                                <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                                    <Upload size={12} />
                                </div>
                                <div className="flex flex-col text-[0.7rem]">
                                    <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Upload attachment</span>
                                    <span className="text-[0.625rem] text-slate-400 font-normal">Upload attachment to ticket</span>
                                </div>
                            </button>

                            {/* Option 2: Download File / View Attachments */}
                            <button
                                onClick={handleOpenDownloadModal}
                                className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-50/90 border border-transparent hover:border-slate-200/60 flex items-center gap-2.5 transition-all cursor-pointer group"
                            >
                                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                                    <Download size={12} />
                                </div>
                                <div className="flex flex-col text-[0.7rem]">
                                    <span className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Download attachments</span>
                                    <span className="text-[0.625rem] text-slate-400 font-normal">View & download ticket attachments</span>
                                </div>
                            </button>
                        </div>
                    </div>,
                    getPortalContainer(),
                )}

            {/* Modal in 7xl size - Styled matching KnowledgeArticleDetailModal */}
            {isModalOpen && (
                <Modal open={isModalOpen} size="7xl" onClose={() => setIsModalOpen(false)} className="p-0">
                    <Modal.Header className="mb-0 border-b-(--brand-color) bg-(--brand-color) p-2 text-sm font-semibold text-(--brand-text-inverse) 2xl:text-base">
                        {title}
                    </Modal.Header>
                    <Modal.Body className="m-0 max-h-[80dvh] px-0 py-0">
                        <ShellLayout className="gap-4 rounded-md border-none p-1 shadow-none">
                            <ShellLayout.Body className="p-0">
                                <SnowAttachmentManager tableName={tableName} tableSysId={tableSysId} />
                            </ShellLayout.Body>
                        </ShellLayout>
                    </Modal.Body>
                </Modal>
            )}
        </>
    );
};

export default SnowTicketAttachmentActions;
