import { twMerge } from 'tailwind-merge';
import Modal from '@/shared/components/ui/Modal/Modal';
import { useGlobalSuccessAlertController } from './useGlobalSuccessAlertController';
import { CheckCircle, Info } from 'lucide-react';
import SuccessAnimatedIcon from '../../ui/Placeholders/SucessAnimatedIcon';

const STATUS_PROPS = {
    success: {
        accent: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
        button: 'text-white  border-none border-transparent btn-split split-green hover:scale-[1.01] active:scale-[0.98]',
        title: 'Success',
        icon: <CheckCircle size={18} />,
        defaultButton: 'Dismiss',
    },
    brand: {
        accent: 'var(--brand-color)',
        iconBg: 'bg-[var(--brand-color)]/10',
        button: 'text-white btn-split split-blue hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        title: 'Notice',
        icon: <Info size={18} className="text-(--brand-color)" />,
        defaultButton: 'Dismiss',
    },
};
function GlobalSuccessAlert() {
    const { open, alertData, handleClose } = useGlobalSuccessAlertController();

    if (!open || !alertData) return null;
    const severity = alertData.severity ?? 'success';
    const props = STATUS_PROPS[severity];
    return (
        <Modal open={open} onClose={handleClose} size="sm" className="success-alert-card ">
            <Modal.Header className="p-4 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base"></Modal.Header>
            <Modal.Body className="text-center overflow-visible px-6 pt-1 pb-1 max-h-none">
                <div className="flex justify-center mb-1">
                    <SuccessAnimatedIcon size={90} />
                </div>
                {alertData.title && <h5 className="text-3xl font-extrabold text-(--brand-title-primary-color) mb-3 tracking-wide">{alertData.title}</h5>}
                {alertData.note && <p className="text-sm text-gray-700 mb-1 leading-relaxed ">{alertData.note}</p>}
                {alertData.noteText && <p className="text-sm text-gray-700 mb-1 leading-relaxed ">{alertData.noteText}</p>}

                {alertData.link && (
                    <div className="mb-1">
                        <a
                            href={alertData.link.href}
                            target={alertData.link.target ?? '_blank'}
                            rel={alertData.link.rel ?? 'noopener noreferrer'}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            {alertData.link.label}
                        </a>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="justify-center pb-6">
                {alertData.actions ? (
                    <div className="flex gap-2 mt-3">
                        {alertData.actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    action.onClick();
                                    handleClose();
                                }}
                                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                    action.variant === 'brand'
                                        ? 'bg-(--brand-color)/10 hover:bg-(--brand-color) text-(--brand-color) hover:text-(--brand-text-inverse) focus:bg-(--brand-color) focus:text-(--brand-text-inverse) border border-(--brand-color)/50'
                                        : action.variant === 'success'
                                          ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white focus:bg-emerald-500 focus:text-white border border-emerald-500/30'
                                          : 'bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white focus:bg-blue-500 focus:text-white border border-blue-500/30'
                                }`}
                            >
                                <span> {action.label}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <button
                        onClick={handleClose}
                        className={twMerge(`w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${props.button}`, alertData.buttonClassName)}
                    >
                        <span>{alertData.buttonText || props.defaultButton}</span>
                    </button>
                )}
            </Modal.Footer>
        </Modal>
    );
}

export default GlobalSuccessAlert;
