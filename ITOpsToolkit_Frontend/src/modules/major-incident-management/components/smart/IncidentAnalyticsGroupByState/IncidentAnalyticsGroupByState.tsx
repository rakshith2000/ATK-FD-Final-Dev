import { useIncidentStatsByPriorityAndGroupByState } from '@/modules/major-incident-management/hooks/useIncidentStatsByPriorityAndGroupByState';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import AssignmentGroupStats from '../../ui/AssignmentGroupStats/AssignmentGroupStats';
import StateAndPriorityStats from '../../ui/StateAndPriorityStats/StateAndPriorityStats';

interface IncidentAnalyticsGroupByStateProps {
    selectedState?: string | null;
    onStateSelect?: (state: string | null) => void;
    selectedGroup?: string | null;
    onGroupSelect?: (group: string | null) => void;
    priorities: number[];
    states: number[];
    groups: string[];
    dateRange?: { start: string; end: string };
}

const IncidentAnalyticsGroupByState = ({
    selectedState = null,
    onStateSelect,
    priorities,
    states,
    groups,
    onGroupSelect,
    selectedGroup,
    dateRange,
}: IncidentAnalyticsGroupByStateProps) => {
    const { data, isLoading, error, isError, refetch, isRefetching } = useIncidentStatsByPriorityAndGroupByState({ priorities, states, groups, dateRange });

    const totalCount = data?.total_count ?? 0;
    const stateStats = data?.state_stats ?? [];
    const priorityStats = data?.priority_stats ?? [];
    const groupStats = data?.group_stats ?? [];

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

            {!isLoading && !isError && totalCount === 0 ? <EmptyPlaceholder message="No Major Incidents found !" isRefetching={isRefetching} onRetry={refetch} /> : null}

            {!isLoading && !isError && totalCount > 0 ? (
                <div className="flex flex-col gap-1.5">
                    <div className="max-h-40 px-1">
                        <StateAndPriorityStats
                            isAnyLocalFilterApplied={!Boolean(selectedGroup || selectedState)}
                            isRefetching={isRefetching}
                            priorities={priorities}
                            priorityStats={priorityStats}
                            refetch={refetch}
                            stateStats={stateStats}
                            totalCount={totalCount}
                            combinedStatePriorityStats={data?.combined_state_priority_stats}
                            onStateSelect={onStateSelect}
                            selectedState={selectedState}
                        />
                    </div>
                    <div className="max-h-40 px-1">
                        <AssignmentGroupStats groupStats={groupStats} onGroupSelect={onGroupSelect} selectedGroup={selectedGroup} />
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default IncidentAnalyticsGroupByState;
