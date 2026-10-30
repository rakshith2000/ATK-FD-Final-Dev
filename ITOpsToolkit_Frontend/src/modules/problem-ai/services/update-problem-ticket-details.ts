import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isUpdateProblemTicketDetailsResponse } from '../typeguard/problem-ai.guard';
import type { UpdateProblemTicketDetailsRequest, UpdateProblemTicketDetailsResponse } from '../types/problem-ai';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

const updateProblemTicketDetails = async (payload: UpdateProblemTicketDetailsRequest): Promise<UpdateProblemTicketDetailsResponse> => {
    return withApiResponseHandler<UpdateProblemTicketDetailsResponse>(async () => {
        if (appConfig?.isInDemoEnvironment) {
            globalAlertDialogEventBus.emit('show-dialog', {
                note: appConfig.demoEnvironmentActionMessage,
                severity: 'info',
                title: 'DEMO',
            });
            return 'Demo mode: update simulated';
        }

        const response = await backendApiClient.post(appConfig.backend.api.problem_update_details, payload);

        if (response?.data?.output?.data && isUpdateProblemTicketDetailsResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to update the problem ticket details from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default updateProblemTicketDetails;
