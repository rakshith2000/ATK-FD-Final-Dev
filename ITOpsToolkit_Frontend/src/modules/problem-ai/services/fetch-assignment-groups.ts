import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isListAssignmentGroupsResponse } from '../typeguard/problem-ai.guard';
import type { ListAssignmentGroupsResponse } from '../types/problem-ai';

const fetchAssignmentGroups = async (): Promise<ListAssignmentGroupsResponse> => {
    return withApiResponseHandler<ListAssignmentGroupsResponse>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.problem_assignment_groups);

        if (response?.data?.output?.data && isListAssignmentGroupsResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrieve the assignment groups from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default fetchAssignmentGroups;
