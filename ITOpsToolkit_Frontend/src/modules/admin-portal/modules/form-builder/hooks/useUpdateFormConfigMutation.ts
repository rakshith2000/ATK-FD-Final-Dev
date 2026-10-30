import { useMutation } from '@tanstack/react-query';
import updateFormConfigurationService from '../services/update-form-configuration.service';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import getErrorTitle from '@/api/utils/get-error-title';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import queryClient from '@/react-query-client';
import { FORM_CONFIG_BY_NAME_QUERY_KEY } from './useFormConfigByNameQuery';

function useUpdateFormConfigMutation() {
    return useMutation({
        mutationFn: updateFormConfigurationService,
        onError: (error: Error) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: getErrorTitle(error),
                note: error.message,
                severity: 'error',
            });
        },
        onSuccess: (message) => {
            queryClient.invalidateQueries({
                queryKey: [FORM_CONFIG_BY_NAME_QUERY_KEY],
                type: 'all',
                exact: false,
                refetchType: 'all',
            });
            globalAlertToastEventBus.emit('show-alert-toast', {
                title: message,
                position: 'top-center',
                severity: 'success',
            });
        },
    });
}

export default useUpdateFormConfigMutation;
