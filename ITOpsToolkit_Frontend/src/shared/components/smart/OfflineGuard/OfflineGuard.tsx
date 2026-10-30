import React, { useEffect } from 'react';
import { RiWifiOffLine } from 'react-icons/ri';
import Modal from '../../ui/Modal/Modal';
import { useOfflineStatus } from '@/shared/hooks/useOfflineStatus';
import logger from '@/shared/utils/logger';

interface OfflineGuardProps {
    disableNavigation?: boolean;
    onRetryClick?: () => void;
}

const OfflineGuard: React.FC<OfflineGuardProps> = ({ disableNavigation = true, onRetryClick }) => {
    const offline = useOfflineStatus();

    useEffect(() => {
        if (!disableNavigation) return;
        function blockClicks(e: Event) {
            if (!offline) return;
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('a[href], button[data-nav], [role="link"]')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        if (offline) {
            document.addEventListener('click', blockClicks, true);
        } else {
            document.removeEventListener('click', blockClicks, true);
        }
        return () => document.removeEventListener('click', blockClicks, true);
    }, [offline, disableNavigation]);

    useEffect(() => {
        const cls = 'app-offline';
        if (offline) {
            document.body.classList.add(cls);
        } else {
            document.body.classList.remove(cls);
        }
        return () => document.body.classList.remove(cls);
    }, [offline]);

    return (
        <Modal protalClassName="z-500002" open={offline} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} size="lg">
            <Modal.Header>
                <div className="flex flex-col justify-center w-full items-center gap-2">
                    <RiWifiOffLine className="text-5xl text-destructive mb-1 text-blue-500/80" />
                    <h1 className="text-center text-destructive text-lg font-semibold text-blue-500/80">No Internet Connection</h1>
                </div>
            </Modal.Header>
            <Modal.Body>
                <div className="space-y-1">
                    <div className="text-sm text-center font-medium">You are offline, Please check your network and Retry</div>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Modal.ActionButton
                    variant="primary"
                    className="w-24 cursor-pointer bg-blue-500 hover:bg-blue-600 focus:ring-blue-300 text-white font-bold"
                    onClick={() => {
                        logger.info('Retrying connection...');
                        if (onRetryClick) onRetryClick();
                        if (navigator.onLine) {
                            window.dispatchEvent(new Event('online'));
                        }
                    }}
                >
                    Retry
                </Modal.ActionButton>
            </Modal.Footer>
        </Modal>
    );
};

export default OfflineGuard;
