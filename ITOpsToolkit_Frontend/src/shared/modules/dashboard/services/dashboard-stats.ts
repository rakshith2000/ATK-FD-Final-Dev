import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';

const PAGE_SIZE = 1000;

export type DashboardStatsDateRange = {
    start: string;
    end: string;
};

export interface DashboardStatsFilters {
    priorities?: number[];
    assignment_groups?: string[];
    assigned_to?: string;
    states?: Array<number | string>;
    categories?: string[];
    dateRange?: DashboardStatsDateRange;
    stateQueryField?: string;
}

export const fetchServiceNowDashboardStats = async <TRecord>({
    apiPath,
    fields,
    filters,
}: {
    apiPath: string;
    fields: string;
    filters: DashboardStatsFilters;
}): Promise<Array<TRecord>> => {
    return withApiResponseHandler<Array<TRecord>>(async () => {
        const allRecords: TRecord[] = [];
        let offset = 0;
        const queryParts: string[] = [];

        const { priorities, assignment_groups, assigned_to, states, categories, dateRange, stateQueryField = 'state' } = filters;

        if (states && states.length > 0) {
            queryParts.push(`${stateQueryField}IN${states.join(',')}`);
        }
        if (priorities && priorities.length > 0) {
            queryParts.push(`priorityIN${priorities.join(',')}`);
        }
        if (assignment_groups && assignment_groups.length > 0) {
            queryParts.push(`assignment_groupIN${assignment_groups.join(',')}`);
        }
        if (assigned_to) {
            queryParts.push(`assigned_to=${assigned_to}`);
        }
        if (categories && categories.length > 0) {
            queryParts.push(`categoryIN${categories.join(',')}`);
        }
        if (dateRange?.start && dateRange?.end) {
            queryParts.push(`sys_created_onBETWEENjavascript:gs.dateGenerate('${dateRange.start}','00:00:00')@javascript:gs.dateGenerate('${dateRange.end}','23:59:59')`);
        }

        const query = queryParts.join('^');

        while (true) {
            const response = await serviceNowApiClient.get<{ result: Array<TRecord> }>(
                `${apiPath}?sysparm_display_value=all&sysparm_fields=${fields}&sysparm_query=${query}&sysparm_limit=${PAGE_SIZE}&sysparm_offset=${offset}`,
            );

            const page = response?.data?.result;
            if (!Array.isArray(page) || page.length === 0) break;

            allRecords.push(...page);
            if (page.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        }

        return allRecords;
    });
};
