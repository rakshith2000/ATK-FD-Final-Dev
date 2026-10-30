import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { isStringArrayMap } from '@/shared/type-guards/is-string-array-map';

export const fetchKbCategories = async (): Promise<Record<string, string[]>> => {
    return withApiResponseHandler<Record<string, string[]>>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listKbCategories);

        if (response?.data?.output?.data && isStringArrayMap(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to get the KB categories from API !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};
