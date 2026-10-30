import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isListGroupMembersResponse } from '../typeguard/problem-ai.guard';
import type { ListGroupMembersRequest, ListGroupMembersResponse } from '../types/problem-ai';

const fetchGroupMembers = async ({ assignment_group }: ListGroupMembersRequest): Promise<ListGroupMembersResponse> => {
    return withApiResponseHandler<ListGroupMembersResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.problem_group_members, { assignment_group });

        if (response?.data?.output?.data && isListGroupMembersResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrieve the group members from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default fetchGroupMembers;
