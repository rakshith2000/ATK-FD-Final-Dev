import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isListMeetingsByParticipantAndGroupResponse } from '../type-guard/meeting-ai.guard';
import type { FetchMeetingsByGroupsAndUserRequest, ListMeetingsByParticipantAndGroupResponse } from '../types/meeting-ai';

const fetchMeetingByGrpUser = async ({ email, groups }: FetchMeetingsByGroupsAndUserRequest) => {
    return withApiResponseHandler<ListMeetingsByParticipantAndGroupResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.meeting_by_grp_partcipants, {
            email,
            groups,
        });

        if (response?.data?.output?.data && isListMeetingsByParticipantAndGroupResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrive meeting list from API Response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default fetchMeetingByGrpUser;
