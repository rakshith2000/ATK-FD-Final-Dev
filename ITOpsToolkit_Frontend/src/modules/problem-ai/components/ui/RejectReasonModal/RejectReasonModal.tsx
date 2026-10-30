import Modal from '@/shared/components/ui/Modal/Modal';
import { TextInput } from '@/shared/components/ui/InputFields';

interface RejectReasonModalProps {
    open: boolean;
    reason: string;
    onChangeReason: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
    submitLabel?: string;
    title?: string;
    isSubmitting?: boolean;
}

const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
    open,
    reason,
    onChangeReason,
    onClose,
    onSubmit,
    submitLabel = 'Reject',
    title = 'Please mention the reason for rejection',
    isSubmitting,
}) => {
    const isDisabled = !reason.trim() || !!isSubmitting;

    return (
        <Modal className="pb-3" open={open} onClose={onClose} size="md">
            <Modal.Header className=" p-2 flex-col items-center text-center  bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse)">
                <h2 className="text-sm 2xl:text-base text-white">{title}</h2>
            </Modal.Header>

            <Modal.Body className="text-center overflow-visible px-6 pt-1 pb-1 max-h-none">
                <TextInput value={reason} onChange={onChangeReason} multiline rows={4} placeholder="Enter the rejection reason..." />
            </Modal.Body>

            <Modal.Footer className="justify-between gap-10  px-6">
                <Modal.ActionButton variant="brand" onClick={onSubmit} disabled={isDisabled}>
                    {submitLabel}
                </Modal.ActionButton>
                <Modal.ActionButton className="btn-split split-white-blue-light" onClick={onClose}>
                    Cancel
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default RejectReasonModal;
