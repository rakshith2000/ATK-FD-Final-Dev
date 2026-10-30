import { useState } from 'react';
import { useUserAssignmentGroups } from '@/shared/modules/dashboard/hooks/useUserAssignmentGroups';
import { type DashboardFilterState, defaultDashboardFilter, getDateRangeFromDashboardFilter } from '@/shared/modules/dashboard/components/ui/DashboardFilterBar/DashboardFilterBar';
import { useSCRequestStatsByPriorityAndGroupByState } from '../hooks/useSCRequestStatsByPriorityAndGroupByState';
import { useSCRequestTaskSlas } from '../hooks/useSCRequestTaskSlas';
import { SCRequestDashboardHeader, type TabId } from '../components/layout/SCRequestDashboardHeader/SCRequestDashboardHeader';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';
import { QueuePage } from './QueuePage';
import { VolumePage } from './VolumePage';
import { PerformancePage } from './PerformancePage';
import '@/shared/modules/dashboard/styles/dashboard.css';

const ServiceRequestDashboardPage = () => {
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
    const selectedStates = dashboardFilter.state ?? [];

    /* ── Data fetch (single hook, shared across all tabs) ── */
    const { data, isLoading, isError, error, refetch, isRefetching } = useSCRequestStatsByPriorityAndGroupByState({
        priorities: activePriorities,
        states: selectedStates,
        groups: selectedGroups,
        context: dashboardFilter.context,
        dateRange,
    });

    const { data: userGroups = [] } = useUserAssignmentGroups();
    const assignmentGroupOptions = userGroups;
    const userGroupValues = userGroups.map((g) => g.value).filter(Boolean);

    const slaAssignmentGroups = selectedGroups.length > 0 ? selectedGroups : userGroupValues.length > 0 ? userGroupValues : undefined;
    const { data: slaData } = useSCRequestTaskSlas(
        'sc_req_item',
        {
            priorities: activePriorities.length > 0 ? activePriorities : undefined,
            states: selectedStates.length > 0 ? selectedStates.filter(Boolean) : undefined,
            assignment_groups: slaAssignmentGroups,
            dateRange,
        },
        dashboardFilter.context as 'me' | 'org',
        !!slaAssignmentGroups,
    );

    const { data: stateOptions = [] } = useTicketFieldChoiceQuery('sc_request', 'request_state');

    return (
        <div id="service-request-dashboard" className="w-full h-full flex flex-col overflow-hidden ">
            {/* ── Sticky Header ── */}
            <SCRequestDashboardHeader
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
                    />
                )}

                {activeTab === 'volume' && <VolumePage data={data} isLoading={isLoading} isError={isError} error={error} refetch={refetch} />}

                {activeTab === 'performance' && <PerformancePage data={data} isLoading={isLoading} isError={isError} error={error} refetch={refetch} slaData={slaData} />}
            </main>
        </div>
    );
};

export default ServiceRequestDashboardPage;
