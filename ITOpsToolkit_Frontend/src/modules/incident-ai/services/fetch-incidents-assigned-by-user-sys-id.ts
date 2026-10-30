import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import { isSnowTicketArray } from '@/shared/modules/servicenow/type-guards/ticket.guards';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import { SNOW_INCIDENT_REQUIRED_FIELDS } from '@/shared/modules/servicenow/constants/incident-fields';

export const fetchIncidentsAssignedByUserSysId = async ({
    searchValue,
    limit = 20,
    offset = 0,
}: {
    searchValue?: string;
    limit?: number;
    offset?: number;
}): Promise<Array<SnowTicket>> => {
    return withApiResponseHandler<Array<SnowTicket>>(async () => {
        const { sys_id } = await getAuthProviderInstance().getUserSnowDetails();

        const baseUrl = appConfig.serviceNow.api.incidentTable;

        let query = `assigned_to=${sys_id}^stateNOT IN6,7,8`;
        if (searchValue && searchValue.trim()) {
            const term = searchValue.trim();
            query = `numberLIKE${term}^ORshort_descriptionLIKE${term}^${query}`;
        }

        const response = await serviceNowApiClient.get(baseUrl, {
            params: {
                sysparm_query: query,
                sysparm_display_value: 'all',
                sysparm_fields: SNOW_INCIDENT_REQUIRED_FIELDS,
                sysparm_limit: limit,
                sysparm_offset: offset,
            },
        });

        if ('result' in response?.data && isSnowTicketArray(response.data['result'])) {
            return response.data['result'];
        } else {
            throw new Error('Failed to get the user assgiend incidents from Service Now !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
