import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface SnowAssignmentGroupMember {
    sys_id: {
        display_value: string;
        value: string;
    };
    user: {
        display_value: string;
        link: string;
        value: string;
    };
}

export const fetchSnowAssignmentGroupMembersBySysId = async ({
    groupSysId,
    searchTerm,
}: {
    groupSysId: string;
    searchTerm?: string;
}): Promise<Array<SnowAssignmentGroupMember>> => {
    return withApiResponseHandler<Array<SnowAssignmentGroupMember>>(async () => {
        let url = appConfig.serviceNow.api.groupMembersByGroupSysId.replaceAll(/<GROUP_SYS_ID_PLACEHOLDER>/g, groupSysId);
        if (searchTerm) {
            url += `%5Euser.nameLIKE${encodeURIComponent(searchTerm)}`;
        }
        url += '&sysparm_limit=20';
        const response = await serviceNowApiClient.get(url);

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            return response?.data?.result;
        } else {
            throw new Error('Unable to get the assignment groups members from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
