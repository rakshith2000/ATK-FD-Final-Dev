import { useState } from 'react';
import MultiSelectInput from '@/shared/components/ui/InputFields/MultiSelectInput';
import DateRangeInput from '@/shared/components/ui/InputFields/DateRangeInput';

export type PeriodPreset = 'today' | '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'custom';
export type DashboardContext = 'org' | 'me';

export interface DashboardFilterState {
    period: PeriodPreset;
    customFrom: string;
    customTo: string;
    context: DashboardContext;
    priorities: string[];
    assignmentGroup: string[];
    state: string[];
    category: string[];
}

export const defaultDashboardFilter: DashboardFilterState = {
    period: '30d',
    customFrom: '',
    customTo: '',
    context: 'org',
    priorities: [],
    assignmentGroup: [],
    state: [],
    category: [],
};

function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export function getDateRangeFromDashboardFilter(filter: DashboardFilterState): { start: string; end: string } {
    const now = new Date();
    const todayStr = toDateStr(now);

    switch (filter.period) {
        case 'today':
            return { start: todayStr, end: todayStr };
        case '7d': {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return { start: toDateStr(d), end: todayStr };
        }
        case '30d': {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            return { start: toDateStr(d), end: todayStr };
        }
        case '90d': {
            const d = new Date(now);
            d.setDate(d.getDate() - 90);
            return { start: toDateStr(d), end: todayStr };
        }
        case 'mtd':
            return {
                start: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
                end: todayStr,
            };
        case 'ytd':
            return {
                start: toDateStr(new Date(now.getFullYear(), 0, 1)),
                end: todayStr,
            };
        case 'custom':
            return {
                start: filter.customFrom || todayStr,
                end: filter.customTo || todayStr,
            };
        default:
            return { start: todayStr, end: todayStr };
    }
}

const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'mtd', label: 'Month to date' },
    { id: 'ytd', label: 'Year to date' },
];

const CONTEXT_OPTIONS: { id: DashboardContext; label: string }[] = [
    { id: 'org', label: 'All org' },
    { id: 'me', label: 'Assigned to me' },
];

const PRIORITY_COLORS: Record<string, string> = {
    '1': '#a32633',
    '2': '#d0473e',
    '3': '#e8a33d',
    '4': '#2f5fb0',
    '5': '#8aa3c4',
};

function FilterLabel({ children }: { children: React.ReactNode }) {
    return <span className="text-[0.7rem] uppercase tracking-wide font-semibold whitespace-nowrap text-(--brand-title-primary-color) opacity-50">{children}</span>;
}

function SegBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`btn-split ${active ? 'split-blue' : 'split-white-blue-light'} px-3 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]`}
        >
            <span>{label}</span>
        </button>
    );
}

function ChipBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; color?: string }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`btn-split ${active ? 'split-blue' : 'split-white-blue-light'} px-3 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]`}
        >
            <span>{label}</span>
        </button>
    );
}

export interface DropdownOption {
    value: string;
    label: string;
}

export interface DashboardFilterBarProps {
    filter: DashboardFilterState;
    onChange: (filter: DashboardFilterState) => void;

    availablePriorities?: string[];

    showContext?: boolean;

    showAssignmentGroup?: boolean;
    assignmentGroupOptions?: DropdownOption[];
    assignmentGroupPlaceholder?: string;

    /** Show state multiselect — default false */
    showState?: boolean;
    stateOptions?: DropdownOption[];
    statePlaceholder?: string;

    showCategory?: boolean;
    categoryOptions?: DropdownOption[];
    categoryPlaceholder?: string;
}

export function DashboardFilterBar({
    filter,
    onChange,
    availablePriorities = ['1', '2', '3', '4', '5'],
    showContext = true,
    showAssignmentGroup = false,
    assignmentGroupOptions = [],
    assignmentGroupPlaceholder = 'All assignment groups',
    showState = false,
    stateOptions = [],
    statePlaceholder = 'All states',
    showCategory = false,
    categoryOptions = [],
    categoryPlaceholder = 'All categories',
}: DashboardFilterBarProps) {
    const [customFrom, setCustomFrom] = useState(filter.customFrom);
    const [customTo, setCustomTo] = useState(filter.customTo);
    const [isSelectingCustom, setIsSelectingCustom] = useState(filter.period === 'custom');

    const set = <K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) => onChange({ ...filter, [key]: value });

    const isFiltered =
        filter.period !== defaultDashboardFilter.period ||
        filter.context !== defaultDashboardFilter.context ||
        filter.priorities.length > 0 ||
        filter.assignmentGroup.length > 0 ||
        filter.state.length > 0 ||
        filter.category.length > 0;

    const clearFilters = () => {
        setCustomFrom('');
        setCustomTo('');
        setIsSelectingCustom(false);
        onChange(defaultDashboardFilter);
    };

    const togglePriority = (p: string) => {
        const next = filter.priorities.includes(p) ? filter.priorities.filter((x) => x !== p) : [...filter.priorities, p];
        set('priorities', next);
    };

    const handlePeriodChange = (period: PeriodPreset) => {
        if (period === 'custom') {
            setIsSelectingCustom(true);
            return;
        }
        onChange({ ...filter, period, customFrom: '', customTo: '' });
        setCustomFrom('');
        setCustomTo('');
        setIsSelectingCustom(false);
    };

    const applyCustomRange = () => {
        if (customFrom && customTo) {
            onChange({ ...filter, period: 'custom', customFrom, customTo });
            setIsSelectingCustom(false);
        }
    };

    const canApply = !!(customFrom && customTo);

    return (
        <div className="flex flex-wrap items-center gap-2.5 px-6 py-2.5 border-t border-[rgba(20,50,110,0.10)]">
            {/* ── Period ── */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <div className="inline-flex gap-1 border border-[rgba(20,50,110,0.12)] rounded-full p-0.5">
                    {PERIOD_PRESETS.map((p) => (
                        <SegBtn key={p.id} label={p.label} active={filter.period === p.id} onClick={() => handlePeriodChange(p.id)} />
                    ))}
                </div>
                <ChipBtn label="Custom" active={filter.period === 'custom' || isSelectingCustom} onClick={() => handlePeriodChange('custom')} />
                {(filter.period === 'custom' || isSelectingCustom) && (
                    <span className="flex items-center gap-1.5">
                        <div className="w-64">
                            <DateRangeInput
                                value={[customFrom || undefined, customTo || undefined]}
                                onChange={(range) => {
                                    setCustomFrom(range[0] || '');
                                    setCustomTo(range[1] || '');
                                }}
                                placeholder="Select date range..."
                                maxDate={new Date()}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!canApply}
                            onClick={applyCustomRange}
                            className={`btn-split ${canApply ? 'split-blue' : 'split-slate'} text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                        >
                            <span>Apply</span>
                        </button>
                    </span>
                )}
            </div>

            {/* ── Context ── */}
            {showContext && (
                <div className="flex items-center gap-1.5">
                    <FilterLabel>Context</FilterLabel>
                    <div className="inline-flex gap-0.5 border border-[rgba(20,50,110,0.12)] rounded-full p-0.5">
                        {CONTEXT_OPTIONS.map((c) => (
                            <SegBtn key={c.id} label={c.label} active={filter.context === c.id} onClick={() => set('context', c.id)} />
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1.5">
                <FilterLabel>Priority</FilterLabel>
                <div className="inline-flex gap-1 border border-[rgba(20,50,110,0.12)] rounded-full p-0.5">
                    {availablePriorities.map((p) => (
                        <ChipBtn key={p} label={`P${p}`} active={filter.priorities.includes(p)} color={PRIORITY_COLORS[p]} onClick={() => togglePriority(p)} />
                    ))}
                </div>
            </div>

            {showAssignmentGroup && (
                <div className="w-56 min-w-[200px]">
                    <MultiSelectInput
                        value={filter.assignmentGroup}
                        onChange={(val) => set('assignmentGroup', val)}
                        options={assignmentGroupOptions}
                        placeholder={assignmentGroupPlaceholder}
                        triggerClassName="py-1.5 px-2.5 text-xs rounded-md border border-[rgba(20,50,110,0.22)] text-(--brand-title-primary-color)"
                    />
                </div>
            )}

            {showState && (
                <div className="w-56 min-w-[200px]">
                    <MultiSelectInput
                        value={filter.state}
                        onChange={(val) => set('state', val)}
                        options={stateOptions}
                        placeholder={statePlaceholder}
                        triggerClassName="py-1.5 px-2.5 text-xs rounded-md border border-[rgba(20,50,110,0.22)] text-(--brand-title-primary-color)"
                    />
                </div>
            )}

            {showCategory && (
                <div className="w-56 min-w-[200px]">
                    <MultiSelectInput
                        value={filter.category}
                        onChange={(val) => set('category', val)}
                        options={categoryOptions}
                        placeholder={categoryPlaceholder}
                        triggerClassName="py-1.5 px-2.5 text-xs rounded-md border border-[rgba(20,50,110,0.22)] text-(--brand-title-primary-color)"
                    />
                </div>
            )}

            {isFiltered && (
                <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto text-xs font-semibold text-(--brand-title-primary-color) underline cursor-pointer opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
