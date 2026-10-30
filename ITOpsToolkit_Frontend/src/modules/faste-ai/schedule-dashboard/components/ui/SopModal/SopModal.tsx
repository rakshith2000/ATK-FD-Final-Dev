import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { sopTextToHtml } from '@/modules/faste-ai/sop-dashboard/utils/sopFormatting';

interface SopModalProps {
    open: boolean;
    onClose: () => void;
    onCancel: () => void;
    sopDetails: { name: string; content: string } | null;
}

export const SopModal: React.FC<SopModalProps> = ({ open, onClose, onCancel, sopDetails }) => {
    const formattedSopHtml = useMemo(() => {
        if (!sopDetails?.content) return '';
        return sopTextToHtml(sopDetails.content);
    }, [sopDetails?.content]);

    return (
        <Modal
            open={open}
            size="3xl"
            onClose={onCancel}
            closeButtonClassName="top-3 right-3 w-8 h-8 rounded-2xl bg-gray-100/90 hover:bg-gray-200 text-gray-500 border border-gray-200/50 flex items-center justify-center transition-colors shadow-xs"
        >
            {/* Header */}
            <Modal.Header className="pt-2 px-3 mb-2 pr-14 flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                    <FileText className="text-[#001a80] mt-0.5 shrink-0" size={22} />
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-[#001a80] font-bold text-base leading-snug tracking-tight">{sopDetails?.name ?? 'SOP Content Blueprint'}</h2>
                    </div>
                </div>
            </Modal.Header>

            {/* Content Body Container */}
            <Modal.Body className="p-5 border border-[#c3e0ff] shadow-[inset_0px_0px_18px_0px_rgba(89,172,255,0.22)] rounded-2xl bg-white space-y-2 max-h-[60vh] overflow-y-auto mx-4 my-2">
                {sopDetails?.content ? (
                    <div
                        className="prose prose-sm max-w-none text-slate-700 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-indigo-900 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-indigo-900 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-indigo-800 [&_pre]:text-xs [&_code]:text-xs [&_p]:text-xs [&_li]:text-xs [&_p]:leading-relaxed [&_li]:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formattedSopHtml }}
                    />
                ) : (
                    <p className="text-slate-400 text-xs italic">No description content provided for this SOP.</p>
                )}
            </Modal.Body>

            {/* Footer */}
            <Modal.Footer className="justify-end pt-1 pb-3 pr-4 mt-1">
                <Modal.ActionButton variant="brand" onClick={onClose} className="max-w-30 rounded-xl font-semibold">
                    Select
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};
