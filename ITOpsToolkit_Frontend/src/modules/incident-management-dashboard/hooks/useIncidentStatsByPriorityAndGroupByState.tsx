import { incidentStatsByPriorityAndGroupByState, type ServiceNowIncident } from '../services/incident-stats.service';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';
import { useStatsByPriorityAndGroupByState, type StatsByPriorityAndGroupByStateResult } from '@/shared/modules/dashboard/hooks/useStatsByPriorityAndGroupByState';

export interface IncidentStatsResult extends StatsByPriorityAndGroupByStateResult<ServiceNowIncident> {
    raw_incidents: Array<ServiceNowIncident>;
}

export function useIncidentStatsByPriorityAndGroupByState({
    priorities,
    states,
    groups,
    categories,
    context = 'me',
    dateRange,
}: {
    priorities: number[];
    states: number[];
    groups: string[];
    categories?: string[];
    context?: 'org' | 'me';
    dateRange?: { start: string; end: string };
}) {
    const { getUserSnowDetails } = useAuth();
    const queryKey = [
        'incident-stats-by-priority-and-group-by-state',
        JSON.stringify(priorities),
        JSON.stringify(states),
        JSON.stringify(dateRange),
        context,
        JSON.stringify(groups),
        JSON.stringify(categories),
    ];

    return useStatsByPriorityAndGroupByState<ServiceNowIncident, IncidentStatsResult>({
        queryKey,
        groups,
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();
            const userMemberOfAssignmentGroups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
            const userGroupValues = userMemberOfAssignmentGroups.map((g) => g.value).filter(Boolean);

            if (context === 'me') {
                return incidentStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assigned_to: userSnowDetails.sys_id,
                    assignment_groups: groups.length > 0 ? groups : userGroupValues.length > 0 ? userGroupValues : undefined,
                    dateRange,
                    categories,
                });
            }

            if (groups.length > 0) {
                return incidentStatsByPriorityAndGroupByState({
                    priorities,
                    states,
                    assignment_groups: groups,
                    dateRange,
                    categories,
                });
            }

            if (userGroupValues.length === 0) {
                return [];
            }

            return incidentStatsByPriorityAndGroupByState({
                priorities,
                states,
                assignment_groups: userGroupValues,
                dateRange,
                categories,
            });
        },
        getStateValue: (incident) => incident.state?.value || 'unknown',
        getStateLabel: (incident) => incident.state?.display_value || 'Unknown',
        getPriorityValue: (incident) => incident.priority?.value || 'unknown',
        getPriorityLabel: (incident) => incident.priority?.display_value || 'Unknown',
        getGroupValue: (incident) => incident.assignment_group?.value,
        getGroupLabel: (incident) => incident.assignment_group?.display_value,
        select: (result) => ({
            ...result,
            raw_incidents: result.raw_items,
        }),
    });
}
