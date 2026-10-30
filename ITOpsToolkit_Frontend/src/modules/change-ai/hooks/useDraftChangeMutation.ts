import { useMutation } from '@tanstack/react-query';
import draftChange from '../services/draft-change';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';

export function useDraftChangeMutation() {
    return useMutation({
        mutationFn: draftChange,
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
        onSuccess: () => {
            globalAlertToastEventBus.emit('show-alert-toast', {
                severity: 'success',
                title: 'Change draft generated !',
                position: 'top-center',
            });
        },
    });
}
