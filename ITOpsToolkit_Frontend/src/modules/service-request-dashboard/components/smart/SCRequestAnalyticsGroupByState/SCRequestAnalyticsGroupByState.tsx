import { useMemo } from 'react';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import AssignmentGroupStats from '@/shared/modules/servicenow/components/ui/AssignmentGroupStats/AssignmentGroupStats';
import StateAndPriorityStats from '@/shared/modules/servicenow/components/ui/StateAndPriorityStats/StateAndPriorityStats';
import { useSCRequestStatsByPriorityAndGroupByState } from '../../../hooks/useSCRequestStatsByPriorityAndGroupByState';

interface SCRequestAnalyticsGroupByStateProps {
    selectedDrilldownState?: string | null;
    onStateToggle?: (state: string) => void;
    selectedDrilldownGroup?: string | null;
    onGroupToggle?: (group: string) => void;
    priorities: number[];
    states: string[];
    groups: string[];
    dateRange?: { start: string; end: string };
    onClearAll?: () => void;
}

const SCRequestAnalyticsGroupByState = ({
    selectedDrilldownState = null,
    onStateToggle,
    priorities,
    states,
    groups,
    onGroupToggle,
    selectedDrilldownGroup = null,
    dateRange,
    onClearAll,
}: SCRequestAnalyticsGroupByStateProps) => {
    const { data, isLoading, error, isError, refetch, isRefetching } = useSCRequestStatsByPriorityAndGroupByState({ priorities, states, groups, dateRange });

    const rawSCRequest = data?.raw_sc_requests ?? [];

    // Calculate filtered counts based on single drilldown selection
    const { filteredGroupStats, filteredStateStats } = useMemo(() => {
        const filteredGroupStatsResult = data?.group_stats ?? [];
        const filteredStateStatsResult = data?.state_stats ?? [];

        // If a state is selected, calculate filtered group stats
        if (selectedDrilldownState) {
            const filtered = rawSCRequest.filter((req) => req.request_state?.value === selectedDrilldownState);

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
            const filtered = rawSCRequest.filter((req) => req.assignment_group?.value === selectedDrilldownGroup);

            const stateMap = new Map<string, { label: string; value: string; count: number }>();
            data?.state_stats?.forEach((stat) => {
                stateMap.set(stat.value, { label: stat.label, value: stat.value, count: 0 });
            });

            filtered.forEach((req) => {
                const stateVal = req.request_state?.value;
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
    }, [rawSCRequest, selectedDrilldownState, selectedDrilldownGroup, data?.state_stats, data?.group_stats]);

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

            {!isLoading && !isError && totalCount === 0 ? <EmptyPlaceholder message="No Service Requests found !" isRefetching={isRefetching} onRetry={refetch} /> : null}

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
                            totalLabel="Total Service Request"
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

export default SCRequestAnalyticsGroupByState;
