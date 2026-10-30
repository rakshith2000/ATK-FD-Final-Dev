import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';

const deleteLiteLLMProxy = async () => {
    return withApiResponseHandler<{ message: string }>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }
        const response = await backendApiClient.post(appConfig.backend.api.deleteLiteLLMProxy);

        if (response?.data?.output?.message && typeof response?.data?.output?.message === 'string') {
            logger.debug(response?.data?.output);
            return { message: response?.data?.output?.message ?? '' };
        } else {
            throw new Error('Failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default deleteLiteLLMProxy;
