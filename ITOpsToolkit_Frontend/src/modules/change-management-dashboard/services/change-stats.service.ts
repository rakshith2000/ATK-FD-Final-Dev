import { appConfig } from '@/config/app-config';
import { fetchServiceNowDashboardStats } from '@/shared/modules/dashboard/services/dashboard-stats';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export type ServiceNowChangeRequest = SnowTicket;

export const changeStatsByPriorityAndGroupByState = async ({
    priorities,
    assignment_groups,
    assigned_to,
    states,
    dateRange,
}: {
    priorities?: number[];
    assignment_groups?: string[];
    assigned_to?: string;
    states?: number[];
    dateRange?: { start: string; end: string };
}): Promise<Array<ServiceNowChangeRequest>> => {
    return fetchServiceNowDashboardStats<ServiceNowChangeRequest>({
        apiPath: appConfig.serviceNow.api.changeRequestTable,
        fields: 'sys_id,number,short_description,priority,state,type,assignment_group,assigned_to,sys_created_on,sys_updated_on,risk,start_date,end_date,closed_at,made_sla,reopen_count',
        filters: {
            priorities,
            assignment_groups,
            assigned_to,
            states,
            dateRange,
        },
    });
};
