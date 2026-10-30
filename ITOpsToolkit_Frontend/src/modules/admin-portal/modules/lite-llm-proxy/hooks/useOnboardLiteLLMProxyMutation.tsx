import { useMutation } from '@tanstack/react-query';
import logger from '@/shared/utils/logger';
import getErrorTitle from '@/api/utils/get-error-title';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import onboardLiteLLMProxy from '../services/onboard-lite-llm-proxy';

const useOnboardLiteLLMProxyMutation = () => {
    return useMutation({
        mutationFn: onboardLiteLLMProxy,
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

export default useOnboardLiteLLMProxyMutation;
