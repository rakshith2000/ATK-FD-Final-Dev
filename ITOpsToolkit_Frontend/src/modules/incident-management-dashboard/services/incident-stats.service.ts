import { appConfig } from '@/config/app-config';
import { fetchServiceNowDashboardStats } from '@/shared/modules/dashboard/services/dashboard-stats';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export type ServiceNowIncident = SnowTicket;

export const incidentStatsByPriorityAndGroupByState = async ({
    priorities,
    assignment_groups,
    assigned_to,
    states,
    dateRange,
    categories,
}: {
    priorities: number[];
    assignment_groups?: string[];
    assigned_to?: string;
    states?: number[];
    categories?: string[];
    dateRange?: { start: string; end: string };
}): Promise<Array<ServiceNowIncident>> => {
    return fetchServiceNowDashboardStats<ServiceNowIncident>({
        apiPath: appConfig.serviceNow.api.incidentTable,
        fields: 'sys_id,number,short_description,priority,urgency,impact,state,category,assignment_group,assigned_to,caller_id,sys_created_on,sys_updated_on,active,problem_id,closed_at,resolved_at,made_sla,reopen_count,severity,problem',
        filters: {
            priorities,
            assignment_groups,
            assigned_to,
            states,
            categories,
            dateRange,
        },
    });
};
