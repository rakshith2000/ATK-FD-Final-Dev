import { DashboardHeader, type DashboardTab } from '@/shared/modules/dashboard/components/ui/DashboardHeader/DashboardHeader';
import { type DashboardFilterState, type DropdownOption } from '@/shared/modules/dashboard/components/ui/DashboardFilterBar/DashboardFilterBar';

export type TabId = 'queue' | 'volume' | 'performance';

function PulseIcon() {
    return (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function TargetIcon() {
    return (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    );
}

const TABS: DashboardTab[] = [
    { id: 'queue', label: 'Queue', hint: 'Real-time operations', icon: <PulseIcon /> },
    { id: 'volume', label: 'Volume', hint: 'Trends & backlog', icon: <ChartIcon /> },
    { id: 'performance', label: 'Performance', hint: 'RCA & SLA', icon: <TargetIcon /> },
];

export interface ProblemDashboardHeaderProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    dashboardFilter: DashboardFilterState;
    onDashboardFilterChange: (f: DashboardFilterState) => void;
    assignmentGroupOptions?: DropdownOption[];
    stateOptions?: DropdownOption[];
    categoryOptions?: DropdownOption[];
    hasDrilldown: boolean;
    onClearDrilldown: () => void;
    isRefetching?: boolean;
}

export function ProblemDashboardHeader({
    activeTab,
    onTabChange,
    dashboardFilter,
    onDashboardFilterChange,
    assignmentGroupOptions = [],
    stateOptions = [],
    categoryOptions = [],
    hasDrilldown,
    onClearDrilldown,
    isRefetching,
}: ProblemDashboardHeaderProps) {
    return (
        <DashboardHeader
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={onTabChange as (tab: string) => void}
            dashboardFilter={dashboardFilter}
            onDashboardFilterChange={onDashboardFilterChange}
            assignmentGroupOptions={assignmentGroupOptions}
            filterBarProps={{
                availablePriorities: ['1', '2', '3', '4', '5'],
                showContext: true,
                showAssignmentGroup: true,
                assignmentGroupPlaceholder: 'All assignment groups',
                showState: true,
                stateOptions,
                statePlaceholder: 'All states',
                showCategory: true,
                categoryOptions,
                categoryPlaceholder: 'All categories',
            }}
            hasDrilldown={hasDrilldown}
            onClearDrilldown={onClearDrilldown}
            isRefetching={isRefetching}
        />
    );
}
