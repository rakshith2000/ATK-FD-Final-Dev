import { changeStatsByPriorityAndGroupByState, type ServiceNowChangeRequest } from '../services/change-stats.service';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { useStatsByPriorityAndGroupByState, type StatsByPriorityAndGroupByStateResult } from '@/shared/modules/dashboard/hooks/useStatsByPriorityAndGroupByState';

export interface ChangeStatsResult extends StatsByPriorityAndGroupByStateResult<ServiceNowChangeRequest> {
    raw_changes: Array<ServiceNowChangeRequest>;
}

export function useChangeStatsByPriorityAndGroupByState({
    priorities = [],
    states = [],
    groups = [],
    context = 'org',
    dateRange,
}: {
    priorities?: number[];
    states?: number[];
    groups?: string[];
    context?: 'org' | 'me';
    dateRange?: { start: string; end: string };
}) {
    const { getUserSnowDetails } = useAuth();
    const queryKey = [
        'change-stats-by-priority-and-group-by-state',
        JSON.stringify(priorities),
        JSON.stringify(states),
        JSON.stringify(dateRange),
        context,
        JSON.stringify(groups),
    ];

    return useStatsByPriorityAndGroupByState<ServiceNowChangeRequest, ChangeStatsResult>({
        queryKey,
        groups,
        queryFn: async () => {
            const assignmentGroupsToFilter = groups.length > 0 ? groups : undefined;

            if (context === 'me') {
                const userSnowDetails = await getUserSnowDetails();
                return changeStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assigned_to: userSnowDetails.sys_id,
                    assignment_groups: assignmentGroupsToFilter,
                    dateRange,
                });
            }

            // context === 'org': show all organization change requests unless groups are explicitly selected
            return changeStatsByPriorityAndGroupByState({
                priorities,
                states,
                assignment_groups: assignmentGroupsToFilter,
                dateRange,
            });
        },
        getStateValue: (chg) => chg.state?.value || 'unknown',
        getStateLabel: (chg) => chg.state?.display_value || 'Unknown',
        getPriorityValue: (chg) => chg.priority?.value || 'unknown',
        getPriorityLabel: (chg) => chg.priority?.display_value || 'Unknown',
        getGroupValue: (chg) => chg.assignment_group?.value,
        getGroupLabel: (chg) => chg.assignment_group?.display_value,
        select: (result) => ({
            ...result,
            raw_changes: result.raw_items,
        }),
    });
}
