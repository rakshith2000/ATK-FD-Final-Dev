import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export type GroupWiseStats = {
    count: number;
    value: string;
    label: string;
};

export interface StatsByPriorityAndGroupByStateResult<TItem> {
    total_count: number;
    state_stats: Array<GroupWiseStats>;
    priority_stats: Array<GroupWiseStats>;
    group_stats: Array<GroupWiseStats>;
    combined_state_priority_stats: Array<{
        state: string;
        stateVal: string;
        [priority: string]: string | number;
    }>;
    raw_items: Array<TItem>;
}

type UseStatsByPriorityAndGroupByStateArgs<TItem, TSelected = StatsByPriorityAndGroupByStateResult<TItem>> = {
    queryKey: readonly unknown[];
    groups?: string[];
    queryFn: () => Promise<Array<TItem>>;
    getStateValue: (item: TItem) => string;
    getStateLabel: (item: TItem) => string;
    getPriorityValue: (item: TItem) => string;
    getPriorityLabel: (item: TItem) => string;
    getGroupValue?: (item: TItem) => string | null | undefined;
    getGroupLabel?: (item: TItem) => string | null | undefined;
    select?: (result: StatsByPriorityAndGroupByStateResult<TItem>) => TSelected;
};

export function useStatsByPriorityAndGroupByState<TItem, TSelected = StatsByPriorityAndGroupByStateResult<TItem>>({
    queryKey,
    groups = [],
    queryFn,
    getStateValue,
    getStateLabel,
    getPriorityValue,
    getPriorityLabel,
    getGroupValue,
    getGroupLabel,
    select,
}: UseStatsByPriorityAndGroupByStateArgs<TItem, TSelected>): UseQueryResult<TSelected, Error> {
    return useQuery<Array<TItem>, Error, TSelected>({
        queryKey: [...queryKey],
        queryFn,
        select: (data) => {
            const allData = data ?? [];
            const filteredData = allData.filter((item) => {
                if (!groups || groups.length === 0) return true;
                const groupValue = getGroupValue?.(item);
                return groupValue ? groups.includes(groupValue) : false;
            });

            const total_count = filteredData.length;

            const stateCounts: Record<string, { label: string; count: number }> = {};
            const priorityCounts: Record<string, { label: string; count: number }> = {};
            const groupCounts: Record<string, { label: string; count: number }> = {};
            const combinedStatePriorityMap: Record<string, { state: string; stateVal: string; [priority: string]: string | number }> = {};

            filteredData.forEach((item) => {
                const stateVal = getStateValue(item);
                const stateLabel = getStateLabel(item);
                if (!stateCounts[stateVal]) {
                    stateCounts[stateVal] = { label: stateLabel, count: 0 };
                }
                stateCounts[stateVal].count += 1;

                const priorityVal = getPriorityValue(item);
                const priorityLabel = getPriorityLabel(item);
                if (!priorityCounts[priorityVal]) {
                    priorityCounts[priorityVal] = { label: priorityLabel, count: 0 };
                }
                priorityCounts[priorityVal].count += 1;

                if (!combinedStatePriorityMap[stateVal]) {
                    combinedStatePriorityMap[stateVal] = { state: stateLabel, stateVal };
                }

                const currentValue = combinedStatePriorityMap[stateVal][priorityVal] || 0;
                combinedStatePriorityMap[stateVal][priorityVal] = Number(currentValue) + 1;
            });

            allData.forEach((item) => {
                const groupValue = getGroupValue?.(item);
                const groupLabel = getGroupLabel?.(item);
                if (!groupValue || !groupLabel) {
                    return;
                }

                if (!groupCounts[groupValue]) {
                    groupCounts[groupValue] = { label: groupLabel, count: 0 };
                }
                groupCounts[groupValue].count += 1;
            });

            const baseResult: StatsByPriorityAndGroupByStateResult<TItem> = {
                total_count,
                state_stats: Object.entries(stateCounts).map(([value, info]) => ({
                    value,
                    label: info.label,
                    count: info.count,
                })),
                priority_stats: Object.entries(priorityCounts).map(([value, info]) => ({
                    value,
                    label: info.label,
                    count: info.count,
                })),
                group_stats: Object.entries(groupCounts).map(([value, info]) => ({
                    value,
                    label: info.label,
                    count: info.count,
                })),
                combined_state_priority_stats: Object.values(combinedStatePriorityMap),
                raw_items: filteredData || [],
            };

            return (select ? select(baseResult) : (baseResult as TSelected)) as TSelected;
        },
    });
}
