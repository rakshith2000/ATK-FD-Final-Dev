import { useMutation } from '@tanstack/react-query';
import uploadVaultConfig from '../services/upload-vault-config';
import logger from '@/shared/utils/logger';
import getErrorTitle from '@/api/utils/get-error-title';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export const useUploadVaultConfigMutation = () => {
    return useMutation({
        mutationFn: uploadVaultConfig,
        onError: (error) => {
            logger.debug('Failed to upload vault config with error: ', error);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
        onSuccess: (data) => {
            logger.debug('Successfully uploaded vault config with response: ', data);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Successfully Uploaded !',
                note: data?.message,
                severity: 'success',
                buttonText: 'Dismiss',
                priority: 'normal',
            });
        },
    });
};
