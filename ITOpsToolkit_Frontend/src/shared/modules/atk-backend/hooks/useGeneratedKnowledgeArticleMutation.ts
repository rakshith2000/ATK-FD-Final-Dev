import { useMutation } from '@tanstack/react-query';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import generateKbArticle from '../services/generate-kb-article';

export function useGeneratedKnowledgeArticleMutation() {
    return useMutation({
        mutationFn: generateKbArticle,
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
