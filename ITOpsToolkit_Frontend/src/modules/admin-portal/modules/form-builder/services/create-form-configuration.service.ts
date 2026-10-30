import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { FormConfigRecord } from '../types/form-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';

function createFormConfigurationService({ form_name, form_config }: { form_name: string; form_config: FormConfigRecord }) {
    return withApiResponseHandler<string>(async () => {
        await getAuthProviderInstance().initialize();

        const currentUser = `${getAuthProviderInstance().getUser()?.username} (${getAuthProviderInstance().getUser()?.email})`;

        const response = await backendApiClient.post(appConfig.backend.api.create_form_configuration, {
            name: form_name,
            form: { ...form_config, version: 1, created_at: new Date().toUTCString(), updated_at: new Date().toUTCString(), created_by: currentUser, updated_by: currentUser },
        });

        return response?.data?.output?.message || 'No Message Recived from API';
    });
}

export default createFormConfigurationService;
