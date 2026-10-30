import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface SnowGroup {
    display_value: string;
    link: string;
    value: string;
}

function isSnowGroup(obj: unknown): obj is SnowGroup {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'display_value' in obj &&
        'link' in obj &&
        'value' in obj &&
        typeof (obj as { display_value: unknown }).display_value === 'string' &&
        typeof (obj as { link: unknown }).link === 'string' &&
        typeof (obj as { value: unknown }).value === 'string'
    );
}

function isSnowGroupResult(obj: unknown): obj is { result: { group: SnowGroup }[] } {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'result' in obj &&
        Array.isArray((obj as { result: unknown }).result) &&
        (obj as { result: unknown[] }).result.every(
            (item: unknown) => typeof item === 'object' && item !== null && 'group' in item && isSnowGroup((item as { group: unknown }).group),
        )
    );
}

export const fetchSnowUserMemberOfAssignmentGroupsByUserSysId = async ({ sys_id, nameSearchTerm }: { sys_id: string; nameSearchTerm?: string }): Promise<Array<SnowGroup>> => {
    return withApiResponseHandler<Array<SnowGroup>>(async () => {
        let url = appConfig.serviceNow.api.userMemberOfAssignmentGroupsByUserSysId.replaceAll(/<USER_SYS_ID_PLACEHOLDER>/g, sys_id);
        if (nameSearchTerm) {
            url += `&sysparm_limit=100&sysparm_query=nameLIKE${encodeURIComponent(nameSearchTerm)}`;
        }
        const response = await serviceNowApiClient.get(url);

        if (isSnowGroupResult(response?.data)) {
            return response.data.result.map((item) => item.group);
        } else {
            throw new Error('Unable to get the assignment groups from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
