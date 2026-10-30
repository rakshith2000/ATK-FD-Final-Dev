import { useMutation } from '@tanstack/react-query';
import pushChangeRequestToItsm from '../services/push-change-request-to-itsm';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';

export function usePushChangeRequestToItsmMutation() {
    return useMutation({
        mutationFn: pushChangeRequestToItsm,
        onError: (error) => {
            logger.debug(error);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
        onSuccess: (data) => {
            logger.debug(data);
            globalAlertToastEventBus.emit('show-alert-toast', {
                severity: 'success',
                title: `Change request ${data?.number} pushed to ITSM successfully !`,
                position: 'top-center',
                autoCloseDuration: 5000,
            });
        },
    });
}
