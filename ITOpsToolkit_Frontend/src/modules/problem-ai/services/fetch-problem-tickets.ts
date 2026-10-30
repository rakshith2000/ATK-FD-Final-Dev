import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isListProblemTicketsResponse } from '../typeguard/problem-ai.guard';
import type { ListProblemTicketsRequest, ListProblemTicketsResponse } from '../types/problem-ai';

const fetchProblemTickets = async ({ status }: ListProblemTicketsRequest): Promise<ListProblemTicketsResponse> => {
    return withApiResponseHandler<ListProblemTicketsResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.problem_list_tickets, { status });

        if (response?.data?.output?.data && isListProblemTicketsResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrieve the problem tickets from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default fetchProblemTickets;
