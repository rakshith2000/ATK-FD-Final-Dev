import type { ReactNode } from 'react';
import {
    DashboardFilterBar,
    type DashboardFilterState,
    type DropdownOption,
    type DashboardFilterBarProps,
} from '@/shared/modules/dashboard/components/ui/DashboardFilterBar/DashboardFilterBar';

export interface DashboardTab {
    id: string;
    label: string;
    hint: string;
    icon: ReactNode;
}

export interface DashboardHeaderProps {
    tabs: DashboardTab[];
    activeTab: string;
    onTabChange: (tab: string) => void;

    dashboardFilter: DashboardFilterState;
    onDashboardFilterChange: (f: DashboardFilterState) => void;
    assignmentGroupOptions?: DropdownOption[];
    filterBarProps?: Partial<Omit<DashboardFilterBarProps, 'filter' | 'onChange'>>;

    hasDrilldown?: boolean;
    onClearDrilldown?: () => void;
    isRefetching?: boolean;
}

export function DashboardHeader({
    tabs,
    activeTab,
    onTabChange,
    dashboardFilter,
    onDashboardFilterChange,
    assignmentGroupOptions = [],
    filterBarProps = {},
    hasDrilldown,
    onClearDrilldown,
    isRefetching,
}: DashboardHeaderProps) {
    return (
        <header
            className="sticky top-0 z-30"
            style={{
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'saturate(1.4) blur(10px)',
                borderBottom: '1px solid rgba(20,50,110,0.12)',
            }}
        >
            {/* ── Row 1: tabs + status ── */}
            <div className="flex items-center gap-3 px-6 py-2.5 flex-wrap" style={{ borderBottom: '1px solid rgba(20,50,110,0.08)' }}>
                <nav className="flex gap-2" role="tablist" aria-label="Dashboard views">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => onTabChange(tab.id)}
                                className={`btn-split ${isActive ? 'split-blue' : 'split-white-blue-light'} inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13.5px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${isActive ? 'shadow-[0_1px_2px_rgba(20,50,110,0.05),0_4px_12px_rgba(20,50,110,0.15)]' : ''}`}
                            >
                                <span className="flex items-center gap-2">
                                    {tab.icon}
                                    {tab.label}
                                    <span className={`text-[0.7rem] font-normal ${isActive ? 'opacity-80' : 'opacity-50'}`}>· {tab.hint}</span>
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="flex-1" />

                {hasDrilldown && onClearDrilldown && (
                    <button
                        onClick={onClearDrilldown}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-700 cursor-pointer transition-all duration-200 hover:bg-red-100 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Clear drilldown
                    </button>
                )}

                {isRefetching && (
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-slate-200 text-(--brand-title-primary-color)">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Refreshing…
                    </div>
                )}
            </div>

            {/* ── Row 2: filter bar ── */}
            <DashboardFilterBar filter={dashboardFilter} onChange={onDashboardFilterChange} assignmentGroupOptions={assignmentGroupOptions} {...filterBarProps} />
        </header>
    );
}
