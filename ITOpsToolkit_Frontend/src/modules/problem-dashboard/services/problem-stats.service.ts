import { appConfig } from '@/config/app-config';
import { fetchServiceNowDashboardStats } from '@/shared/modules/dashboard/services/dashboard-stats';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export type ServiceNowProblem = SnowTicket;

export const problemStatsByPriorityAndGroupByState = async ({
    priorities,
    assignment_groups,
    assigned_to,
    states,
    categories,
    dateRange,
}: {
    priorities: number[];
    assignment_groups?: string[];
    assigned_to?: string;
    states?: number[];
    categories?: string[];
    dateRange?: { start: string; end: string };
}): Promise<Array<ServiceNowProblem>> => {
    return fetchServiceNowDashboardStats<ServiceNowProblem>({
        apiPath: appConfig.serviceNow.api.problemTable,
        fields: 'sys_id,number,short_description,priority,state,urgency,impact,category,assignment_group,assigned_to,sys_created_on,sys_updated_on,active,related_incidents,closed_at,resolved_at,made_sla,reopen_count,problem_state',
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
