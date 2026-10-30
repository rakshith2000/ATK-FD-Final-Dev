import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface SlaRecord {
    sys_id: { value: string; display_value: string };
    task: { value: string; display_value: string };
    sla: { value: string; display_value: string };
    has_breached: { value: string; display_value: string };
    business_percentage: { value: string; display_value: string };
    business_time_left: { value: string; display_value: string };
    stage: { value: string; display_value: string };
}

export interface TaskSlaFilters {
    states?: (string | number)[];
    priorities?: number[];
    assignment_groups?: string[];
    assigned_to?: string;
    categories?: string[];
    dateRange?: {
        start: string;
        end: string;
    };
}

const SLA_FIELDS = 'sys_id,task,sla,stage,has_breached,business_percentage,business_time_left';

const PAGE_SIZE = 1000;

export const fetchTaskSlas = async (taskClassName: string, stateField: 'state' | 'request_state', filters?: TaskSlaFilters): Promise<SlaRecord[]> => {
    return withApiResponseHandler<SlaRecord[]>(async () => {
        const allRecords: SlaRecord[] = [];
        let offset = 0;

        const queryParts: string[] = [`task.sys_class_name=${taskClassName}`];

        if (filters?.states?.length) {
            queryParts.push(`task.${stateField}IN${filters.states.filter(Boolean).join(',')}`);
        }

        if (filters?.priorities?.length) {
            queryParts.push(`task.priorityIN${filters.priorities.join(',')}`);
        }

        if (filters?.assignment_groups?.length) {
            queryParts.push(`task.assignment_groupIN${filters.assignment_groups.join(',')}`);
        }

        if (filters?.assigned_to) {
            queryParts.push(`task.assigned_to=${filters.assigned_to}`);
        }

        if (filters?.categories?.length) {
            queryParts.push(`task.categoryIN${filters.categories.join(',')}`);
        }

        if (filters?.dateRange?.start && filters?.dateRange?.end) {
            queryParts.push(
                `sys_created_onBETWEENjavascript:gs.dateGenerate('${filters.dateRange.start}','00:00:00')@javascript:gs.dateGenerate('${filters.dateRange.end}','23:59:59')`,
            );
        }

        queryParts.push('ORDERBYDESCbusiness_percentage');

        const query = queryParts.join('^');

        while (true) {
            const response = await serviceNowApiClient.get<{
                result: SlaRecord[];
            }>(
                `${appConfig.serviceNow.api.taskSlaTable}?sysparm_fields=${SLA_FIELDS}&sysparm_query=${query}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${PAGE_SIZE}&sysparm_offset=${offset}`,
            );

            const page = response?.data?.result;

            if (!Array.isArray(page) || page.length === 0) {
                break;
            }

            allRecords.push(...page);

            if (page.length < PAGE_SIZE) {
                break;
            }

            offset += PAGE_SIZE;
        }

        return allRecords;
    });
};
