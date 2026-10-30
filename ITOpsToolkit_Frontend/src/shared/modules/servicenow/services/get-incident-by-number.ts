import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export type ServiceNowIncident = SnowTicket;

export const getIncidentByNumber = async ({ incidentNumber }: { incidentNumber: string }): Promise<ServiceNowIncident> => {
    return withApiResponseHandler<ServiceNowIncident>(async () => {
        const response = await serviceNowApiClient.get<{ result: Array<ServiceNowIncident> }>(
            `${appConfig.serviceNow.api.incidentTable}?sysparm_display_value=all&sysparm_query=number=${incidentNumber}&sysparm_limit=1`,
        );

        const resultList = response?.data?.result;

        const inc = resultList.length > 0 ? resultList[0] : null;

        if (inc && Array.isArray(resultList)) {
            return inc;
        } else {
            throw new Error(`Failed to get the incident ${incidentNumber} from Service Now!`, {});
        }
    });
};
