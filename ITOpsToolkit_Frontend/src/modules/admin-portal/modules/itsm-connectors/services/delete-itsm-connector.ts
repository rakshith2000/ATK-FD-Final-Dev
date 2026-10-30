import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { DeleteITSMConnectorResponse, DeleteITSMConnectorRequest } from '../types/itsm-connectors';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { DeleteITSMConnectorResponseSchema } from '../schemas/itsm-connectors.schemas';

const deleteItsmConnector = async ({ payload }: { payload: DeleteITSMConnectorRequest }) => {
    return withApiResponseHandler<DeleteITSMConnectorResponse>(async () => {
        if (appConfig.isInDemoEnvironment) {
            return {
                message: appConfig.demoEnvironmentActionMessage,
            };
        }

        const response = await backendApiClient.post(appConfig.backend.api.deleteITSMConnector, {
            ...payload,
        });

        if (!response?.data?.output) {
            throw new Error('response?.data?.output not found');
        }

        return await DeleteITSMConnectorResponseSchema.parseAsync(response.data.output);
    });
};

export default deleteItsmConnector;
