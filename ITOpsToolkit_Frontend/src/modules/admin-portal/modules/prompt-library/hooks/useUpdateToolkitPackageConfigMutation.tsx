import { useMutation } from '@tanstack/react-query';
import updateToolkitPackageConfig from '../services/update-toolkit-package-config';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';

export const useUpdateToolkitPackageConfigMutation = () => {
    return useMutation({
        mutationFn: updateToolkitPackageConfig,
        onError: (error) => {
            logger.debug('Failed to update the toolkit package config with error: ', error);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
        onSuccess: (data) => {
            logger.debug('Successfully updated the toolkit package config with response: ', data);
        },
    });
};
