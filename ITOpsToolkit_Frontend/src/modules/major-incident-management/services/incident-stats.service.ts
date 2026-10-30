import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export type ServiceNowIncident = SnowTicket;

export const incidentStatsByPriorityAndGroupByState = async ({
    priorities,
    assignment_groups,
    states,
    dateRange,
}: {
    priorities: number[];
    assignment_groups: string[];
    states: number[];
    dateRange?: { start: string; end: string };
}): Promise<Array<ServiceNowIncident>> => {
    if (priorities.length === 0) {
        return [];
    }

    return withApiResponseHandler<Array<ServiceNowIncident>>(async () => {
        let query = `stateIN${states.join(',')}^priorityIN${priorities.join(',')}^assignment_groupIN${assignment_groups.join(',')}`;

        if (dateRange?.start && dateRange?.end) {
            query += `^sys_created_onBETWEENjavascript:gs.dateGenerate('${dateRange.start}','00:00:00')@javascript:gs.dateGenerate('${dateRange.end}','23:59:59')`;
        }

        const response = await serviceNowApiClient.get<{ result: Array<ServiceNowIncident> }>(
            `${appConfig.serviceNow.api.incidentTable}?sysparm_display_value=all&sysparm_fields=sys_id,number,short_description,description,priority,state,category,assignment_group,assigned_to,sys_created_on,sys_updated_on,active,problem_id&sysparm_query=${query}`,
        );

        const resultList = response?.data?.result;
        if (Array.isArray(resultList)) {
            return resultList;
        } else {
            throw new Error('Failed to get the incident stats from Service Now!', {
                cause: {
                    reason: 'response?.data?.result is not an array!',
                },
            });
        }
    });
};
