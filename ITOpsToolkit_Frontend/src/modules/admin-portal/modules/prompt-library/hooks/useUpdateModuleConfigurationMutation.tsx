import { useMutation } from '@tanstack/react-query';
import updateModuleConfiguration from '../services/update-module-configuration';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';

export const useUpdateModuleConfigurationMutation = () => {
    return useMutation({
        mutationFn: updateModuleConfiguration,
        onError: (error) => {
            logger.debug('Failed to update the module configuration with error: ', error);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
        onSuccess: (data) => {
            logger.debug('Successfully updated the module configuration with response: ', data);
        },
    });
};
