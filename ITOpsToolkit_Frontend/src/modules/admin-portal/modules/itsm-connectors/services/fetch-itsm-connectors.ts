import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { ITSMConnectorsListResponseSchema } from '../schemas/itsm-connectors.schemas';
import type { ITSMConnectorsListResponse } from '../types/itsm-connectors';

const fetchITSMConnectors = async () => {
    return withApiResponseHandler<ITSMConnectorsListResponse>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listITSMConnectors);

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found');
        }

        return await ITSMConnectorsListResponseSchema.parseAsync(response.data.output.data);
    });
};

export default fetchITSMConnectors;
