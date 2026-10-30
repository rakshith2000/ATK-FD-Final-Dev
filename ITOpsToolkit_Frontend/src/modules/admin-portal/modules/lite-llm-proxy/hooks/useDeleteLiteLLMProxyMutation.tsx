import { useMutation } from '@tanstack/react-query';
import logger from '@/shared/utils/logger';
import getErrorTitle from '@/api/utils/get-error-title';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import deleteLiteLLMProxy from '../services/delete-lite-llm-proxy';

const useDeleteLiteLLMProxyMutation = () => {
    return useMutation({
        mutationFn: deleteLiteLLMProxy,
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
};

export default useDeleteLiteLLMProxyMutation;
