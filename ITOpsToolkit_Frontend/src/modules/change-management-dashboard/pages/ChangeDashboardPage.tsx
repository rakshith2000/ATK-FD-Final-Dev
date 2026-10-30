import { useMemo, useState } from 'react';
import { useUserAssignmentGroups } from '../hooks/useUserAssignmentGroups';
import { type DashboardFilterState, defaultDashboardFilter, getDateRangeFromDashboardFilter } from '@/shared/modules/dashboard/components/ui/DashboardFilterBar/DashboardFilterBar';
import { useChangeStatsByPriorityAndGroupByState } from '../hooks/useChangeStatsByPriorityAndGroupByState';
import { useChangeSlas } from '../hooks/useChangeSlas';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';
import { ChangeDashboardHeader, type TabId } from '../components/layout/ChangeDashboardHeader/ChangeDashboardHeader';
import { QueuePage } from './QueuePage';
import { VolumePage } from './VolumePage';
import { PerformancePage } from './PerformancePage';
import '@/shared/modules/dashboard/styles/dashboard.css';

const ChangeDashboardPage = () => {
    /* ── Tab state ── */
    const [activeTab, setActiveTab] = useState<TabId>('queue');

    /* ── Drilldown state (Queue tab only) ── */
    const [selectedDrilldownState, setSelectedDrilldownState] = useState<string | null>(null);
    const [selectedDrilldownGroup, setSelectedDrilldownGroup] = useState<string | null>(null);

    const clearDrilldown = () => {
        setSelectedDrilldownState(null);
        setSelectedDrilldownGroup(null);
    };

    /* ── Dashboard filter ── */
    const [dashboardFilter, setDashboardFilter] = useState<DashboardFilterState>(defaultDashboardFilter);

    const dateRange = getDateRangeFromDashboardFilter(dashboardFilter);
    const activePriorities = dashboardFilter.priorities.map(Number);
    const selectedGroups = dashboardFilter.assignmentGroup;
    const selectedStates = dashboardFilter.state.map(Number);

    /* ── Data fetch (single hook, shared across all tabs) ── */
    const { data, isLoading, isError, error, refetch, isRefetching } = useChangeStatsByPriorityAndGroupByState({
        priorities: activePriorities,
        states: selectedStates,
        groups: selectedGroups,
        context: dashboardFilter.context,
        dateRange,
    });

    const { data: userGroups = [] } = useUserAssignmentGroups();
    const assignmentGroupOptions = useMemo(() => {
        const groupMap = new Map<string, string>();
        userGroups.forEach((g) => {
            if (g.value) groupMap.set(g.value, g.label);
        });
        data?.group_stats?.forEach((g) => {
            if (g.value && !groupMap.has(g.value)) {
                groupMap.set(g.value, g.label);
            }
        });
        return Array.from(groupMap.entries()).map(([value, label]) => ({ value, label }));
    }, [userGroups, data?.group_stats]);

    const { data: stateOptions = [] } = useTicketFieldChoiceQuery('change_request', 'state');

    const slaAssignmentGroups = selectedGroups.length > 0 ? selectedGroups : undefined;

    const { data: slaData } = useChangeSlas(
        {
            states: selectedStates.length > 0 ? selectedStates : undefined,
            priorities: activePriorities.length > 0 ? activePriorities : undefined,
            assignment_groups: slaAssignmentGroups,
            dateRange,
        },
        dashboardFilter.context as 'me' | 'org',
        true,
    );

    return (
        <div id="change-dashboard" className="w-full h-full flex flex-col overflow-hidden">
            {/* ── Sticky Header ── */}
            <ChangeDashboardHeader
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab !== 'queue') clearDrilldown();
                }}
                dashboardFilter={dashboardFilter}
                onDashboardFilterChange={setDashboardFilter}
                assignmentGroupOptions={assignmentGroupOptions}
                stateOptions={stateOptions}
                hasDrilldown={!!(selectedDrilldownState || selectedDrilldownGroup)}
                onClearDrilldown={clearDrilldown}
                isRefetching={isRefetching}
            />

            {/* ── Tab content ── */}
            <main className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === 'queue' && (
                    <QueuePage
                        data={data}
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        refetch={refetch}
                        isRefetching={isRefetching}
                        selectedDrilldownState={selectedDrilldownState}
                        selectedDrilldownGroup={selectedDrilldownGroup}
                        slaData={slaData}
                        stateOptions={stateOptions}
                    />
                )}

                {activeTab === 'volume' && <VolumePage data={data} isLoading={isLoading} isError={isError} error={error} refetch={refetch} />}

                {activeTab === 'performance' && <PerformancePage data={data} isLoading={isLoading} isError={isError} error={error} refetch={refetch} slaData={slaData} />}
            </main>
        </div>
    );
};

export default ChangeDashboardPage;
