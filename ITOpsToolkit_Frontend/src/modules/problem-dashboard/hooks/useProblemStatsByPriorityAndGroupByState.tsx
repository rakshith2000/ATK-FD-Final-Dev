import { problemStatsByPriorityAndGroupByState, type ServiceNowProblem } from '../services/problem-stats.service';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';
import { useStatsByPriorityAndGroupByState, type StatsByPriorityAndGroupByStateResult } from '@/shared/modules/dashboard/hooks/useStatsByPriorityAndGroupByState';

export interface ProblemStatsResult extends StatsByPriorityAndGroupByStateResult<ServiceNowProblem> {
    raw_problems: Array<ServiceNowProblem>;
}

export function useProblemStatsByPriorityAndGroupByState({
    priorities,
    states,
    groups,
    categories,
    context = 'me',
    dateRange,
}: {
    priorities: number[];
    states?: number[];
    groups: string[];
    categories?: string[];
    context?: 'org' | 'me';
    dateRange?: { start: string; end: string };
}) {
    const { getUserSnowDetails } = useAuth();

    const queryKey = [
        'problem-stats-by-priority-and-group-by-state',
        JSON.stringify(priorities),
        JSON.stringify(states),
        JSON.stringify(dateRange),
        context,
        JSON.stringify(groups),
        JSON.stringify(categories),
    ];

    return useStatsByPriorityAndGroupByState<ServiceNowProblem, ProblemStatsResult>({
        queryKey,
        groups,
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();
            const userMemberOfAssignmentGroups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
            const userGroupValues = userMemberOfAssignmentGroups.map((g) => g.value).filter(Boolean);

            if (context === 'me') {
                return problemStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assigned_to: userSnowDetails.sys_id,
                    assignment_groups: groups.length > 0 ? groups : userGroupValues.length > 0 ? userGroupValues : undefined,
                    categories,
                    dateRange,
                });
            }

            if (groups.length > 0) {
                return problemStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assignment_groups: groups,
                    categories,
                    dateRange,
                });
            }

            if (userGroupValues.length === 0) {
                return [];
            }

            return problemStatsByPriorityAndGroupByState({
                priorities,
                states,
                assignment_groups: userGroupValues,
                categories,
                dateRange,
            });
        },
        getStateValue: (problem) => problem.state?.value || 'unknown',
        getStateLabel: (problem) => problem.state?.display_value || 'Unknown',
        getPriorityValue: (problem) => problem.priority?.value || 'unknown',
        getPriorityLabel: (problem) => problem.priority?.display_value || 'Unknown',
        getGroupValue: (problem) => problem.assignment_group?.value,
        getGroupLabel: (problem) => problem.assignment_group?.display_value,
        select: (result) => ({
            ...result,
            raw_problems: result.raw_items,
        }),
    });
}
