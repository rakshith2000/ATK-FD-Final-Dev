import { Clock } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';

interface TimeUpModalProps {
    isOpen: boolean;
    onSubmit: () => void;
}

const TimeUpModal: React.FC<TimeUpModalProps> = ({ isOpen, onSubmit }) => {
    return (
        <Modal open={isOpen} size="md" closeOnOutsideClick={false} closeOnEscapeKeyDown={false}>
            <Modal.Header className="p-2 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                <TitleWithArraow title="TIME'S UP!" className="text-sm font-extrabold uppercase text-(--brand-text-inverse) items-center" />
            </Modal.Header>

            <Modal.Body className="px-4 pb-2">
                <div className="rounded border border-orange-200 bg-orange-50 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-orange-500 shrink-0" />
                        <p className="text-sm font-bold text-(--brand-color)">Your quiz time has expired</p>
                    </div>
                    <p className="text-xs text-gray-700">Don't worry — your selected answers will be submitted now. Unanswered questions will be marked as skipped.</p>
                </div>
            </Modal.Body>

            <Modal.Footer className="justify-end px-4 pb-3 pt-1">
                <Modal.ActionButton variant="primary" onClick={onSubmit} className="rounded-md px-6 text-xs font-semibold">
                    Submit Now
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default TimeUpModal;
