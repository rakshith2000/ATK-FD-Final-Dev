import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { UserSnowDetails } from '../types/auth';
import { appConfig } from '@/config/app-config';
import { isUserSnowDetails } from '../type-guards/is-user-snow-details';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';

export const fetchUserServiceNowDetails = async ({ queryKey, queryValue }: { queryKey: string; queryValue: string }): Promise<UserSnowDetails> => {
    return withApiResponseHandler<UserSnowDetails>(async () => {
        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.userDetails, {
            params: {
                sysparm_query: `${queryKey}=${queryValue}`,
                sysparm_fields: ['sys_id', 'user_name', 'name', 'email'].join(','),
                sysparm_limit: 1,
                sysparm_display_value: false,
            },
        });

        if (!response?.data?.result || !Array.isArray(response?.data?.result)) {
            throw new Error('Unable to get users snow detials !, Reposne JSON schema validation failed !');
        }

        if (response.data?.result?.length <= 0) {
            throw new Error('User details not found in Service Now !');
        }

        if (!isUserSnowDetails(response.data?.result?.[0])) {
            throw new Error('Unable to get users snow detials !, Reposne JSON schema validation failed !');
        }

        return response.data?.result?.[0];
    });
};
