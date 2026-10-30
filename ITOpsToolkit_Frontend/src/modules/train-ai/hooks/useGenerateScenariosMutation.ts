import { useMutation } from '@tanstack/react-query';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import generateScenarios from '../services/generate-scenarios';
import type { GenerateScenariosRequest } from '../types/train-ai';

export const useGenerateScenariosMutation = () => {
    return useMutation({
        mutationFn: (payload: GenerateScenariosRequest) => generateScenarios(payload),
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
