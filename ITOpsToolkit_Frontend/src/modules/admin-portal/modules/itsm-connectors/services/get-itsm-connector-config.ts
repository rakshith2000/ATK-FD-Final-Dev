import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import type { GetITSMConnectorConfigRequest, ITSMConnectorConfig } from '../types/itsm-connectors';
import { ITSMConnectorConfigSchema } from '../schemas/itsm-connectors.schemas';

const getITSMConnectorConfig = async ({ payload }: { payload: GetITSMConnectorConfigRequest }) => {
    return withApiResponseHandler<ITSMConnectorConfig>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.getITSMConnectorConfig, {
            ...payload,
        });

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found');
        }

        return await ITSMConnectorConfigSchema.parseAsync(response.data.output.data);
    });
};

export default getITSMConnectorConfig;
