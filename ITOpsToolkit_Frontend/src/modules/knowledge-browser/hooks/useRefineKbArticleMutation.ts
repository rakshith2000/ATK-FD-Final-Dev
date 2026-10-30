import { useMutation } from '@tanstack/react-query';
import refineKbArticle from '../services/refine-kb-article';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';

export function useRefineKbArticleMutation() {
    return useMutation({
        mutationFn: refineKbArticle,
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
        },
    });
}
