import { useMemo } from 'react';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import AssignmentGroupStats from '@/shared/modules/servicenow/components/ui/AssignmentGroupStats/AssignmentGroupStats';
import StateAndPriorityStats from '@/shared/modules/servicenow/components/ui/StateAndPriorityStats/StateAndPriorityStats';
import { useIncidentStatsByPriorityAndGroupByState } from '@/modules/incident-management-dashboard/hooks/useIncidentStatsByPriorityAndGroupByState';

interface IncidentAnalyticsGroupByStateProps {
    selectedDrilldownState?: string | null;
    onStateToggle?: (state: string) => void;
    selectedDrilldownGroup?: string | null;
    onGroupToggle?: (group: string) => void;
    priorities: number[];
    states: number[];
    groups: string[];
    dateRange?: { start: string; end: string };
    onClearAll?: () => void;
}

const IncidentAnalyticsGroupByState = ({
    selectedDrilldownState = null,
    onStateToggle,
    priorities,
    states,
    groups,
    onGroupToggle,
    selectedDrilldownGroup = null,
    dateRange,
    onClearAll,
}: IncidentAnalyticsGroupByStateProps) => {
    const { data, isLoading, error, isError, refetch, isRefetching } = useIncidentStatsByPriorityAndGroupByState({ priorities, states, groups, dateRange });

    const rawIncidents = data?.raw_incidents ?? [];

    // Calculate filtered counts based on single drilldown selection
    const { filteredGroupStats, filteredStateStats } = useMemo(() => {
        const filteredGroupStatsResult = data?.group_stats ?? [];
        const filteredStateStatsResult = data?.state_stats ?? [];

        // If a state is selected, calculate filtered group stats
        if (selectedDrilldownState) {
            const filtered = rawIncidents.filter((inc) => inc.state?.value === selectedDrilldownState);

            const groupMap = new Map<string, { label: string; value: string; count: number }>();
            data?.group_stats?.forEach((stat) => {
                groupMap.set(stat.value, { label: stat.label, value: stat.value, count: 0 });
            });

            filtered.forEach((inc) => {
                const groupVal = inc.assignment_group?.value;
                if (groupVal && groupMap.has(groupVal)) {
                    const stat = groupMap.get(groupVal)!;
                    stat.count += 1;
                }
            });

            return {
                filteredGroupStats: Array.from(groupMap.values()),
                filteredStateStats: filteredStateStatsResult,
            };
        }

        // If a group is selected, calculate filtered state stats
        if (selectedDrilldownGroup) {
            const filtered = rawIncidents.filter((inc) => inc.assignment_group?.value === selectedDrilldownGroup);

            const stateMap = new Map<string, { label: string; value: string; count: number }>();
            data?.state_stats?.forEach((stat) => {
                stateMap.set(stat.value, { label: stat.label, value: stat.value, count: 0 });
            });

            filtered.forEach((inc) => {
                const stateVal = inc.state?.value;
                if (stateVal && stateMap.has(stateVal)) {
                    const stat = stateMap.get(stateVal)!;
                    stat.count += 1;
                }
            });

            return {
                filteredGroupStats: filteredGroupStatsResult,
                filteredStateStats: Array.from(stateMap.values()),
            };
        }

        // No filter selected, return original stats
        return {
            filteredGroupStats: filteredGroupStatsResult,
            filteredStateStats: filteredStateStatsResult,
        };
    }, [rawIncidents, selectedDrilldownState, selectedDrilldownGroup, data?.state_stats, data?.group_stats]);

    // Always use original total count
    const totalCount = data?.total_count ?? 0;
    const stateStats = filteredStateStats;
    const priorityStats = data?.priority_stats ?? [];
    const groupStats = filteredGroupStats;

    return (
        <div className="flex flex-col gap-2 p-0">
            {isLoading ? (
                <div className="border border-gray-50 bg-white rounded-xl p-2">
                    <GridSkeleton GAP={4} rows={1} cols={5} VW={1200} />
                </div>
            ) : null}

            {isError ? (
                <div className="border border-gray-50 bg-white rounded-xl p-5">
                    <ErrorPlaceholder iconSize={100} error={error} onRetry={refetch} />
                </div>
            ) : null}

            {!isLoading && !isError && totalCount === 0 ? <EmptyPlaceholder message="No Incidents found !" isRefetching={isRefetching} onRetry={refetch} /> : null}

            {!isLoading && !isError && totalCount > 0 ? (
                <div className="flex flex-col gap-1.5">
                    <div className="max-h-40 px-1">
                        <StateAndPriorityStats
                            isAnyLocalFilterApplied={!selectedDrilldownState && !selectedDrilldownGroup}
                            isRefetching={isRefetching}
                            priorities={priorities}
                            priorityStats={priorityStats}
                            refetch={refetch}
                            stateStats={stateStats}
                            totalCount={totalCount}
                            combinedStatePriorityStats={data?.combined_state_priority_stats}
                            onStateToggle={onStateToggle}
                            selectedDrilldownState={selectedDrilldownState}
                            hasActiveGroupFilter={!!selectedDrilldownGroup}
                            totalLabel="Total Incidents"
                            onClearAll={onClearAll}
                        />
                    </div>
                    <div className="max-h-40 px-1">
                        <AssignmentGroupStats
                            groupStats={groupStats}
                            onGroupToggle={onGroupToggle}
                            selectedDrilldownGroup={selectedDrilldownGroup}
                            hasActiveStateFilter={!!selectedDrilldownState}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default IncidentAnalyticsGroupByState;
