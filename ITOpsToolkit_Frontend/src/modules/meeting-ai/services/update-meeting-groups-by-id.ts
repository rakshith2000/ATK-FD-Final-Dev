import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isUpdateGroupsByMeetingIdResponse } from '../type-guard/meeting-ai.guard';
import type { MeetingId, UpdateGroupsByMeetingIdResponse, UpdateMeetingGroupsRequest } from '../types/meeting-ai';

const updateMeetingGroupsById = async ({ meetingId, groups }: { meetingId: MeetingId; groups: UpdateMeetingGroupsRequest }) => {
    return withApiResponseHandler<UpdateGroupsByMeetingIdResponse>(async () => {
        const url = appConfig.backend.api.meeting_update_group.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId);

        const response = await backendApiClient.post(url, groups);

        const data = response?.data?.output?.data;

        if (!isUpdateGroupsByMeetingIdResponse(data)) {
            throw new Error('Unable to update meeting groups from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response.data.output.data schema is invalid !',
                },
            });
        }

        return data;
    });
};

export default updateMeetingGroupsById;
