import { useMutation } from '@tanstack/react-query';
import deleteItsmConnector from '../services/delete-itsm-connector';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';

export const useITSMConnectorDeleteMutation = () => {
    return useMutation({
        mutationFn: deleteItsmConnector,
        onError: (error) => {
            logger.debug('Failed to delete the ITSM connector with error: ', error);
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
        onSuccess: (data) => {
            logger.debug('Successfully deleted the ITSM connector with response: ', data);
        },
    });
};
