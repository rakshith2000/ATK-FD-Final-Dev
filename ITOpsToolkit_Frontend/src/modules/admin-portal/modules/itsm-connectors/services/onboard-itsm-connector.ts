import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { OnboardITSMConnectorRequest, OnboardITSMConnectorResponse } from '../types/itsm-connectors';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { OnboardITSMConnectorResponseSchema } from '../schemas/itsm-connectors.schemas';

const onboardItsmConnector = async ({ payload }: { payload: OnboardITSMConnectorRequest }) => {
    return withApiResponseHandler<OnboardITSMConnectorResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }
        const response = await backendApiClient.post(appConfig.backend.api.onboardITSMConnector, {
            ...payload,
            bearer_token: payload.bearer_token ?? '',
            itsm_user: payload.itsm_user ?? '',
            itsm_password: payload.itsm_password ?? '',
            itsm_additional_config: payload.itsm_additional_config ?? {},
        });

        if (!response?.data?.output) {
            throw new Error('response?.data?.output not found');
        }

        return await OnboardITSMConnectorResponseSchema.parseAsync(response.data.output);
    });
};

export default onboardItsmConnector;
