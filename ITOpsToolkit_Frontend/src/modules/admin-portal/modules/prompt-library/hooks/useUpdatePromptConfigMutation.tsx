import { useMutation } from '@tanstack/react-query';
import updatePromptConfig from '../services/update-prompt-config';
import logger from '@/shared/utils/logger';
import getErrorTitle from '@/api/utils/get-error-title';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export const useUpdatePromptConfigMutation = () => {
    return useMutation({
        mutationFn: updatePromptConfig,
        onError: (error) => {
            logger.debug('Failed to update the prompt config with error: ', error);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
        onSuccess: (data) => {
            logger.debug('Successfully updated the prompt config with response: ', data);
        },
    });
};
