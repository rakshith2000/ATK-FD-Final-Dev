import { useQuery } from '@tanstack/react-query';
import { incidentStatsByPriorityAndGroupByState, type ServiceNowIncident } from '../services/incident-stats.service';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';

type GroupWiseStats = {
    count: number;
    value: string;
    label: string;
};

export interface IncidentStatsResult {
    total_count: number;
    state_stats: Array<GroupWiseStats>;
    priority_stats: Array<GroupWiseStats>;
    group_stats: Array<GroupWiseStats>;
    combined_state_priority_stats: Array<{
        state: string;
        stateVal: string;
        [priority: string]: string | number;
    }>;
    raw_incidents: Array<ServiceNowIncident>;
}

export function useIncidentStatsByPriorityAndGroupByState({
    priorities,
    states,
    groups,
    dateRange,
}: {
    priorities: number[];
    states: number[];
    groups: string[];
    dateRange?: { start: string; end: string };
}) {
    const { getUserSnowDetails } = useAuth();
    const queryKey = ['incident-stats-by-priority-and-group-by-state', JSON.stringify(priorities), JSON.stringify(states), JSON.stringify(dateRange)];

    const query = useQuery<Array<ServiceNowIncident>, Error, IncidentStatsResult>({
        queryKey: [...queryKey],
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();
            const userMemberOfAssignmentGroups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
            return incidentStatsByPriorityAndGroupByState({
                priorities,
                states,
                assignment_groups: groups?.length > 0 ? groups : userMemberOfAssignmentGroups.map((group) => group.value),
                dateRange,
            });
        },
        select: (data) => {
            const filteredData =
                data?.filter((inc) => {
                    if (!groups || groups.length === 0) return true;
                    return groups.includes(inc?.assignment_group?.value ?? '');
                }) ?? [];

            const total_count = filteredData?.length ?? 0;

            const stateCounts: Record<string, { label: string; count: number }> = {};
            const priorityCounts: Record<string, { label: string; count: number }> = {};
            const groupCounts: Record<string, { label: string; count: number }> = {};
            const combinedStatePriorityMap: Record<string, { state: string; stateVal: string; [priority: string]: string | number }> = {};

            filteredData?.forEach((incident) => {
                const stateVal = incident.state?.value || 'unknown';
                const stateLabel = incident.state?.display_value || 'Unknown';
                if (!stateCounts[stateVal]) {
                    stateCounts[stateVal] = { label: stateLabel, count: 0 };
                }
                stateCounts[stateVal].count += 1;

                const priorityVal = incident.priority?.value || 'unknown';
                const priorityLabel = incident.priority?.display_value || 'Unknown';
                if (!priorityCounts[priorityVal]) {
                    priorityCounts[priorityVal] = { label: priorityLabel, count: 0 };
                }
                priorityCounts[priorityVal].count += 1;

                const groupVal = incident.assignment_group?.value || 'unknown';
                const groupLabel = incident.assignment_group?.display_value || 'unknown';
                if (!groupCounts[groupVal]) {
                    groupCounts[groupVal] = { label: groupLabel, count: 0 };
                }
                groupCounts[groupVal].count += 1;

                if (!combinedStatePriorityMap[stateVal]) {
                    combinedStatePriorityMap[stateVal] = { state: stateLabel, stateVal: stateVal };
                }

                // Also store under raw priority number (e.g. "1") for robust direct lookup in IncidentSimpleStatsGroupByState
                const currentValVal = combinedStatePriorityMap[stateVal][priorityVal] || 0;
                combinedStatePriorityMap[stateVal][priorityVal] = Number(currentValVal) + 1;
            });

            const state_stats = Object.entries(stateCounts).map(([value, info]) => ({
                value,
                label: info.label,
                count: info.count,
            }));

            const priority_stats = Object.entries(priorityCounts).map(([value, info]) => ({
                value,
                label: info.label,
                count: info.count,
            }));

            const group_stats = Object.entries(groupCounts).map(([value, info]) => ({
                value,
                label: info.label,
                count: info.count,
            }));

            const combined_state_priority_stats = Object.values(combinedStatePriorityMap);

            return {
                total_count,
                state_stats,
                group_stats,
                priority_stats,
                combined_state_priority_stats,
                raw_incidents: filteredData || [],
            };
        },
    });

    return { ...query, queryKey };
}
