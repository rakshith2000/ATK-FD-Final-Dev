import { useMemo } from 'react';
import { useChangeStatsByPriorityAndGroupByState } from '@/modules/change-management-dashboard/hooks/useChangeStatsByPriorityAndGroupByState';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import AssignmentGroupStats from '@/shared/modules/servicenow/components/ui/AssignmentGroupStats/AssignmentGroupStats';
import StateAndPriorityStats from '@/shared/modules/servicenow/components/ui/StateAndPriorityStats/StateAndPriorityStats';

interface ChangeAnalyticsGroupByStateProps {
    selectedDrilldownState?: string | null;
    onStateToggle?: (state: string) => void;
    selectedDrilldownGroup?: string | null;
    onGroupToggle?: (group: string) => void;
    priorities: number[];
    states: number[];
    groups: string[];
    dateRange?: { start: string; end: string };
}

const ChangeAnalyticsGroupByState = ({
    selectedDrilldownState = null,
    onStateToggle,
    priorities,
    states,
    groups,
    onGroupToggle,
    selectedDrilldownGroup = null,
    dateRange,
}: ChangeAnalyticsGroupByStateProps) => {
    const { data, isLoading, error, isError, refetch, isRefetching } = useChangeStatsByPriorityAndGroupByState({ priorities, states, groups, dateRange });

    const rawChanges = data?.raw_changes ?? [];

    const { filteredGroupStats, filteredStateStats } = useMemo(() => {
        const filteredGroupStatsResult = data?.group_stats ?? [];
        const filteredStateStatsResult = data?.state_stats ?? [];

        if (selectedDrilldownState) {
            const filtered = rawChanges.filter((chg) => chg.state?.value === selectedDrilldownState);

            const groupMap = new Map<string, { label: string; value: string; count: number }>();
            data?.group_stats?.forEach((stat) => {
                groupMap.set(stat.value, { label: stat.label, value: stat.value, count: 0 });
            });

            filtered.forEach((chg) => {
                const groupVal = chg.assignment_group?.value;
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

        if (selectedDrilldownGroup) {
            const filtered = rawChanges.filter((chg) => chg.assignment_group?.value === selectedDrilldownGroup);

            const stateMap = new Map<string, { label: string; value: string; count: number }>();
            data?.state_stats?.forEach((stat) => {
                stateMap.set(stat.value, { label: stat.label, value: stat.value, count: 0 });
            });

            filtered.forEach((chg) => {
                const stateVal = chg.state?.value;
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

        return {
            filteredGroupStats: filteredGroupStatsResult,
            filteredStateStats: filteredStateStatsResult,
        };
    }, [rawChanges, selectedDrilldownState, selectedDrilldownGroup, data?.state_stats, data?.group_stats]);

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

            {!isLoading && !isError && totalCount === 0 ? <EmptyPlaceholder message="No Change Requests found !" isRefetching={isRefetching} onRetry={refetch} /> : null}

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

export default ChangeAnalyticsGroupByState;
