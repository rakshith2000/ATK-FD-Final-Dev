import { useState } from 'react';
import { useUserAssignmentGroups } from '@/shared/modules/dashboard/hooks/useUserAssignmentGroups';
import { type DashboardFilterState, defaultDashboardFilter, getDateRangeFromDashboardFilter } from '@/shared/modules/dashboard/components/ui/DashboardFilterBar/DashboardFilterBar';
import { useProblemStatsByPriorityAndGroupByState } from '../hooks/useProblemStatsByPriorityAndGroupByState';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';
import { useProblemTaskSlas } from '../hooks/useProblemTaskSlas';
import { ProblemDashboardHeader, type TabId } from '../components/layout/ProblemDashboardHeader/ProblemDashboardHeader';
import { QueuePage } from './QueuePage';
import { VolumePage } from './VolumePage';
import { PerformancePage } from './PerformancePage';
import '@/shared/modules/dashboard/styles/dashboard.css';

const ProblemDashboardPage = () => {
    const [activeTab, setActiveTab] = useState<TabId>('queue');

    const [selectedDrilldownState, setSelectedDrilldownState] = useState<string | null>(null);
    const [selectedDrilldownGroup, setSelectedDrilldownGroup] = useState<string | null>(null);

    const clearDrilldown = () => {
        setSelectedDrilldownState(null);
        setSelectedDrilldownGroup(null);
    };

    const [dashboardFilter, setDashboardFilter] = useState<DashboardFilterState>(defaultDashboardFilter);

    const dateRange = getDateRangeFromDashboardFilter(dashboardFilter);
    const activePriorities = dashboardFilter.priorities.map(Number);
    const selectedGroups = dashboardFilter.assignmentGroup;
    const selectedStates = dashboardFilter.state.length > 0 ? dashboardFilter.state.map(Number) : [];
    const selectedCategories = dashboardFilter.category.length > 0 ? dashboardFilter.category : [];

    const { data, isLoading, isError, error, refetch, isRefetching } = useProblemStatsByPriorityAndGroupByState({
        priorities: activePriorities,
        states: selectedStates,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        groups: selectedGroups,
        context: dashboardFilter.context,
        dateRange,
    });

    const { data: userGroups = [] } = useUserAssignmentGroups();
    const assignmentGroupOptions = userGroups;
    const userGroupValues = userGroups.map((g) => g.value).filter(Boolean);

    const { data: stateOptions = [] } = useTicketFieldChoiceQuery('problem', 'state');
    const { data: categoryOptions = [] } = useTicketFieldChoiceQuery('problem', 'category');

    const slaAssignmentGroups = selectedGroups.length > 0 ? selectedGroups : userGroupValues.length > 0 ? userGroupValues : undefined;
    const { data: slaData } = useProblemTaskSlas(
        'problem',
        {
            states: selectedStates.length > 0 ? selectedStates : undefined,
            priorities: activePriorities.length > 0 ? activePriorities : undefined,
            assignment_groups: slaAssignmentGroups,
            categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            dateRange,
        },
        dashboardFilter.context as 'me' | 'org',
        !!slaAssignmentGroups,
    );

    return (
        <div id="problem-dashboard" className="w-full h-full flex flex-col overflow-hidden ">
            <ProblemDashboardHeader
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab !== 'queue') clearDrilldown();
                }}
                dashboardFilter={dashboardFilter}
                onDashboardFilterChange={setDashboardFilter}
                assignmentGroupOptions={assignmentGroupOptions}
                stateOptions={stateOptions}
                categoryOptions={categoryOptions}
                hasDrilldown={!!(selectedDrilldownState || selectedDrilldownGroup)}
                onClearDrilldown={clearDrilldown}
                isRefetching={isRefetching}
            />

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

export default ProblemDashboardPage;
