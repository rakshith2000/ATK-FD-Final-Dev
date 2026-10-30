import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { MeetingId } from '../types/meeting-ai';
import { appConfig } from '@/config/app-config';

const deleteMeetingById = async ({ meetingId }: { meetingId: MeetingId }): Promise<void> => {
    return withApiResponseHandler<void>(async () => {
        await backendApiClient.delete(appConfig.backend.api.meeting_delete.replaceAll(/<MEETING_ID_PLACEHOLDER>/g, meetingId));
    });
};
export default deleteMeetingById;
