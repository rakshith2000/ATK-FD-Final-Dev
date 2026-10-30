import { useMutation } from '@tanstack/react-query';
import logger from '../../../utils/logger';
import globalAlertDialogEventBus from '../../../components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import genereateResolutionNotes from '../services/generate-resolution-notes';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';

export function useGenerateResolutionNotesMutation() {
    return useMutation({
        mutationFn: genereateResolutionNotes,
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
                title: 'Resolution notes generated !',
                position: 'top-center',
            });
        },
    });
}
