import { useMutation } from '@tanstack/react-query';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import listIncorrectResponses from '../services/list-incorrect-responses';

export const useListIncorrectResponsesMutation = () => {
    return useMutation({
        mutationFn: (payload: { user_id: string; quiz_code: string }) => listIncorrectResponses(payload),
        onError: (error) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error?.message,
                priority: 'normal',
                severity: 'error',
                buttonText: 'Dismiss',
            });
        },
    });
};
