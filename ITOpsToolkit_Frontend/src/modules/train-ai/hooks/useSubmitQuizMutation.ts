import { useMutation } from '@tanstack/react-query';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import submitQuiz from '../services/submit-quiz';
import type { SubmitQuizRequest } from '../types/train-ai';

export const useSubmitQuizMutation = () => {
    return useMutation({
        mutationFn: (payload: SubmitQuizRequest) => submitQuiz(payload),
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
