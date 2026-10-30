import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isPushProblemTicketToItsmResponse } from '../typeguard/problem-ai.guard';
import type { PushProblemTicketToItsmRequest, PushProblemTicketToItsmResponse } from '../types/problem-ai';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

const pushProblemTicketToItsm = async (payload: PushProblemTicketToItsmRequest): Promise<PushProblemTicketToItsmResponse> => {
    return withApiResponseHandler<PushProblemTicketToItsmResponse>(async () => {
        if (appConfig?.isInDemoEnvironment) {
            globalAlertDialogEventBus.emit('show-dialog', {
                note: appConfig.demoEnvironmentActionMessage,
                severity: 'info',
                title: 'DEMO',
            });

            return 'Demo mode: push simulated';
        }

        const response = await backendApiClient.post(appConfig.backend.api.problem_push_to_itsm, payload);

        if (response?.data?.output?.data && isPushProblemTicketToItsmResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to push the problem ticket to ITSM from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default pushProblemTicketToItsm;
