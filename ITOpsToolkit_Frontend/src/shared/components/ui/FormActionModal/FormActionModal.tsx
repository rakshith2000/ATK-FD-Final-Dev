import Modal, { type ModalProps } from '@/shared/components/ui/Modal/Modal';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import logger from '@/shared/utils/logger';
import { CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

type ActiveTab = 'form' | 'success';

export interface OverlayState {
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
    onRetry?: () => void;
}

interface SuccessConfig {
    title?: string;
    message?: string;
    icon?: ReactNode;
}

interface FormActionModalProps {
    open: boolean;
    onClose: () => void;
    title: string; // form header title
    formSize?: ModalProps['size']; // modal size while form is shown
    successSize?: ModalProps['size']; // modal size on success
    successConfig?: SuccessConfig; // customize success screen
    children: (props: {
        onSuccess: (params: { successMessage: string }) => void;
        onClose: () => void;
        setOverlay: (state: OverlayState) => void;
        setCanClose: (canClose: boolean) => void;
    }) => ReactNode;
}

const FormActionModal: React.FC<FormActionModalProps> = ({ open, onClose, title, formSize = 'xl', successSize = 'md', successConfig, children }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('form');
    const [successMessage, setSuccessMessage] = useState('');
    const [overlayState, setOverlayState] = useState<OverlayState>({});
    const [canClose, setCanClose] = useState(true);

    const handleClose = () => {
        setSuccessMessage('');
        setActiveTab('form');
        setOverlayState({});
        setCanClose(true);
        onClose();
    };

    const handleSuccess = ({ successMessage }: { successMessage: string }) => {
        logger.debug({ successMessage });
        setSuccessMessage(successMessage);
        setActiveTab('success');
        setCanClose(true);
    };

    const headerTitle = activeTab === 'form' ? title : 'Success';
    const modalSize = activeTab === 'form' ? formSize : successSize;

    return (
        <Modal className="p-0" size={modalSize} open={open} onClose={canClose ? handleClose : undefined} closeOnEscapeKeyDown={canClose} closeOnOutsideClick={canClose}>
            <Modal.Header className="mb-0 border-b-(--brand-color) bg-(--brand-color) p-2 font-semibold text-(--brand-text-inverse) text-sm">{headerTitle}</Modal.Header>

            <Modal.Body className="overflow-y-hidden p-0 brand-box-show-inset m-0 grid grid-rows-[1fr]">
                {activeTab === 'form' && (
                    <div className="relative min-h-0 w-full flex flex-col">
                        {overlayState.isLoading ? <LoadingPlaceholder overlay message="Loading..." /> : null}
                        {overlayState.isError && !overlayState.isLoading ? <ErrorPlaceholder overlay error={overlayState.error} onRetry={overlayState.onRetry} /> : null}
                        {children({ onSuccess: handleSuccess, onClose: handleClose, setOverlay: setOverlayState, setCanClose: setCanClose })}
                    </div>
                )}
                {activeTab === 'success' && (
                    <div className="flex flex-col items-center justify-center gap-3 px-3 py-4 text-center">
                        <div className="flex items-center justify-center size-14 rounded-full bg-blue-100">
                            {successConfig?.icon ?? <CheckCircle size={32} className="text-blue-600" />}
                        </div>

                        <div>
                            <h3 className="text-sm 2xl:text-base font-semibold text-(--brand-text-color)">
                                {successMessage ?? successConfig?.title ?? 'Action completed successfully'}
                            </h3>
                            {/* <p className="mt-1 text-xs 2xl:text-sm text-(--brand-text-gray)">{successConfig?.message ?? successMessage}</p> */}
                        </div>

                        <Modal.ActionButton onClick={handleClose} variant="primary" className="min-w-40 max-w-40 mt-2">
                            Close
                        </Modal.ActionButton>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default FormActionModal;
