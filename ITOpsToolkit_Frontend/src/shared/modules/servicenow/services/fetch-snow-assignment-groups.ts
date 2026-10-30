import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface SnowAssignmentGroup {
    sys_id: string;
    name: string;
}

export const fetchSnowAssignmentGroups = async ({ searchTerm }: { searchTerm?: string } = {}): Promise<Array<SnowAssignmentGroup>> => {
    return withApiResponseHandler<Array<SnowAssignmentGroup>>(async () => {
        let url = appConfig.serviceNow.api.assignmentGroups;
        if (searchTerm) {
            url += `&sysparm_limit=20&sysparm_query=nameLIKE${encodeURIComponent(searchTerm)}`;
        }
        const response = await serviceNowApiClient.get(url);

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            return response?.data?.result;
        } else {
            throw new Error('Unable to get the assignment groups from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
