import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';

function deleteFormConfigurationService({ form_name }: { form_name: string }) {
    return withApiResponseHandler<string>(async () => {
        const response = await backendApiClient.delete(appConfig.backend.api.delete_form_configuration.replaceAll('<FORM_NAME_PLACEHOLDER>', form_name));

        return response?.data?.output?.message || 'No Message Recived from API';
    });
}

export default deleteFormConfigurationService;
