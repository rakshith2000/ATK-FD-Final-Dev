import { useMutation } from '@tanstack/react-query';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import getMcqs from '../services/get-mcqs';
import type { GetMcqsRequest } from '../types/train-ai';

export const useGetMcqsMutation = () => {
    return useMutation({
        mutationFn: (payload: GetMcqsRequest) => getMcqs(payload),
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
