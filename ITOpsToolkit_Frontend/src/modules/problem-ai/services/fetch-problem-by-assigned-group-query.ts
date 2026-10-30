import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { isSnowTicketArray } from '@/shared/modules/servicenow/type-guards/ticket.guards';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import { SNOW_INCIDENT_REQUIRED_FIELDS } from '@/shared/modules/servicenow/constants/incident-fields';

export const fetchProblemsByAssignedGroupQuery = async ({
    groupQuery,
    searchValue,
    limit = 20,
    offset = 0,
}: {
    groupQuery: string;
    searchValue?: string;
    limit?: number;
    offset?: number;
}): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        const baseUrl = appConfig.serviceNow.api.problemTable;

        let query = `assignment_groupIN${groupQuery}^stateNOT IN106,107`;
        if (searchValue && searchValue.trim()) {
            const term = searchValue.trim();
            query = `numberLIKE${term}^ORshort_descriptionLIKE${term}^${query}`;
        }

        const response = await serviceNowApiClient.get(baseUrl, {
            params: {
                sysparm_query: query,
                sysparm_display_value: 'all',
                sysparm_fields: `${SNOW_INCIDENT_REQUIRED_FIELDS},related_incidents`,
                sysparm_limit: limit,
                sysparm_offset: offset,
            },
        });

        if (response.data?.result && isSnowTicketArray(response.data['result'])) {
            return response.data['result'];
        } else {
            throw new Error('Failed to get the assigned problem tickets from Service Now by group query!', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
