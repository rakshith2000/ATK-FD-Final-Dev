import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';
import { useStatsByPriorityAndGroupByState, type StatsByPriorityAndGroupByStateResult } from '@/shared/modules/dashboard/hooks/useStatsByPriorityAndGroupByState';
import { SCRequestStatsByPriorityAndGroupByState, type ServiceNowSCRequest } from '../services/service_request-stats.service';

export interface SCRequestStatsResult extends StatsByPriorityAndGroupByStateResult<ServiceNowSCRequest> {
    raw_sc_requests: Array<ServiceNowSCRequest>;
}

export function useSCRequestStatsByPriorityAndGroupByState({
    priorities,
    states,
    groups,
    context = 'me',
    dateRange,
}: {
    priorities: number[];
    states?: string[];
    groups: string[];
    context?: 'org' | 'me';
    dateRange?: { start: string; end: string };
}) {
    const { getUserSnowDetails } = useAuth();

    const queryKey = [
        'sc-request-stats-by-priority-and-group-by-state',
        JSON.stringify(priorities),
        JSON.stringify(states),
        JSON.stringify(dateRange),
        context,
        JSON.stringify(groups),
    ];

    return useStatsByPriorityAndGroupByState<ServiceNowSCRequest, SCRequestStatsResult>({
        queryKey,
        groups,
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();
            const userMemberOfAssignmentGroups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
            const userGroupValues = userMemberOfAssignmentGroups.map((g) => g.value).filter(Boolean);

            if (context === 'me') {
                return SCRequestStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assigned_to: userSnowDetails.sys_id,
                    assignment_groups: groups.length > 0 ? groups : userGroupValues.length > 0 ? userGroupValues : undefined,
                    dateRange,
                });
            }

            if (groups.length > 0) {
                return SCRequestStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assignment_groups: groups,
                    dateRange,
                });
            }

            if (userGroupValues.length === 0) {
                return [];
            }

            return SCRequestStatsByPriorityAndGroupByState({
                priorities,
                states,
                assignment_groups: userGroupValues,
                dateRange,
            });
        },
        getStateValue: (scRequest) => scRequest.request_state?.value || scRequest.state?.value || 'unknown',
        getStateLabel: (scRequest) => scRequest.request_state?.display_value || scRequest.state?.display_value || 'Unknown',
        getPriorityValue: (scRequest) => scRequest.priority?.value || 'unknown',
        getPriorityLabel: (scRequest) => scRequest.priority?.display_value || 'Unknown',
        getGroupValue: (scRequest) => scRequest.assignment_group?.value,
        getGroupLabel: (scRequest) => scRequest.assignment_group?.display_value,
        select: (result) => ({
            ...result,
            raw_sc_requests: result.raw_items,
        }),
    });
}
