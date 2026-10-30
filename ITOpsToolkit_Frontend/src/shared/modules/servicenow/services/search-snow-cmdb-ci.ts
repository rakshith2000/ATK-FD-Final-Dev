import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface SnowCmdbCi {
    sys_id: string;
    name: string;
}

export const searchSnowCmdbCi = async (searchTerm: string): Promise<Array<SnowCmdbCi>> => {
    return withApiResponseHandler<Array<SnowCmdbCi>>(async () => {
        const url = appConfig.serviceNow.api.searchCmdbCi.replaceAll(/<SEARCH_TERM_PLACEHOLDER>/g, encodeURIComponent(searchTerm));
        const response = await serviceNowApiClient.get(url);

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            return response?.data?.result;
        } else {
            throw new Error('Unable to search CMDB CI from Service Now !', {
                cause: { reason: 'response?.data?.result schema is invalid!' },
            });
        }
    });
};
