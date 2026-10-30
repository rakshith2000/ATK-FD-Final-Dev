import { appConfig } from '@/config/app-config';
import { fetchServiceNowDashboardStats } from '@/shared/modules/dashboard/services/dashboard-stats';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export type ServiceNowSCRequest = SnowTicket;

export const SCRequestStatsByPriorityAndGroupByState = async ({
    priorities,
    assignment_groups,
    assigned_to,
    states,
    dateRange,
}: {
    priorities: number[];
    assignment_groups?: string[];
    assigned_to?: string;
    states?: string[];
    dateRange?: { start: string; end: string };
}): Promise<Array<ServiceNowSCRequest>> => {
    return fetchServiceNowDashboardStats<ServiceNowSCRequest>({
        apiPath: appConfig.serviceNow.api.scRequestTable,
        fields: 'sys_id,number,short_description,priority,urgency,impact,request_state,state,assignment_group,assigned_to,sys_created_on,sys_updated_on,active,closed_at,made_sla,description,requested_for,opened_by,cat_item',
        filters: {
            priorities,
            assignment_groups,
            assigned_to,
            states,
            dateRange,
            stateQueryField: 'request_state',
        },
    });
};
