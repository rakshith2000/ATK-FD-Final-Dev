import React from 'react';
import { Save } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';

export interface SaveDraftPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
}

const SaveDraftPromptModal: React.FC<SaveDraftPromptModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Save Article as Draft First ?',
    message = 'To upload images to ServiceNow, this article must first be saved as a draft. Would you like to create a draft in ServiceNow now ?',
}) => {
    return (
        <Modal size="xs" open={isOpen} onClose={onClose} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} className="p-4">
            <Modal.Body className="text-center">
                <div className="flex gap-4 flex-col items-center text-center pt-2">
                    <div className="flex items-center justify-center size-11 rounded-full bg-blue-50 text-blue-600">
                        <Save size={22} />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
                </div>
                <p className="mt-2 text-xs text-gray-600">{message}</p>
            </Modal.Body>

            <Modal.Footer className="flex-row">
                <Modal.ActionButton variant="secondary" onClick={onClose}>
                    Cancel
                </Modal.ActionButton>
                <Modal.ActionButton variant="brand" onClick={onConfirm}>
                    Save as Draft
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default SaveDraftPromptModal;
