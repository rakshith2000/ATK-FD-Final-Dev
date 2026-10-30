import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';

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

export interface TaskSlaResult {
    breached: number;
    atRisk: number;
    compliant: number;
    total: number;
    records: SlaRecord[];
}

interface UseTaskSlasProps {
    taskClassName: string;
    filters?: TaskSlaFilters;
    context?: 'me' | 'org';
    enabled?: boolean;
    queryKeyPrefix?: string;
    fetchTaskSlas: (taskClassName: string, filters?: TaskSlaFilters) => Promise<SlaRecord[]>;
}

export function useTaskSlas({ taskClassName, filters, context, enabled = true, queryKeyPrefix = 'task-slas', fetchTaskSlas }: UseTaskSlasProps) {
    const { getUserSnowDetails } = useAuth();

    return useQuery<SlaRecord[], Error, TaskSlaResult>({
        queryKey: [
            queryKeyPrefix,
            taskClassName,
            JSON.stringify(filters?.states),
            JSON.stringify(filters?.priorities),
            JSON.stringify(filters?.assignment_groups),
            filters?.assigned_to,
            context,
            JSON.stringify(filters?.categories),
            JSON.stringify(filters?.dateRange),
        ],

        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();

            const userMemberOfAssignmentGroups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({
                sys_id: userSnowDetails.sys_id,
            });

            const userGroupValues = userMemberOfAssignmentGroups.map((g) => g.value).filter(Boolean);

            const filtersToApply = { ...filters };

            if (context === 'me') {
                filtersToApply.assigned_to = userSnowDetails.sys_id;

                filtersToApply.assignment_groups = filters?.assignment_groups?.length ? filters.assignment_groups : userGroupValues.length ? userGroupValues : undefined;
            }

            return fetchTaskSlas(taskClassName, filtersToApply);
        },

        enabled: enabled && !!taskClassName,

        select: (records) => {
            let breached = 0;
            let atRisk = 0;
            let compliant = 0;

            records.forEach((r) => {
                const pct = parseFloat(r.business_percentage?.value ?? '0');

                if (r.has_breached?.value === 'true') {
                    breached++;
                } else if (pct >= 75) {
                    atRisk++;
                } else {
                    compliant++;
                }
            });

            return {
                breached,
                atRisk,
                compliant,
                total: records.length,
                records,
            };
        },
    });
}
