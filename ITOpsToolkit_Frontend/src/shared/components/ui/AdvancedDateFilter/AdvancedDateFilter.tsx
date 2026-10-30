import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import DateRangeInput, { type DateRangeValue } from '@/shared/components/ui/InputFields/DateRangeInput';
import dayjs from 'dayjs';

export interface DateFilterValue {
    mode: 'year' | 'quarter' | 'month' | 'custom';
    year: number;
    quarter: number | null;
    month: number | null;
    dateRange: DateRangeValue;
}

interface AdvancedDateFilterProps {
    title?: string;
    value: DateFilterValue;
    onChange: (value: DateFilterValue) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CUR_YR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth();
const YEARS = [CUR_YR - 2, CUR_YR - 1, CUR_YR];

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function capToToday(dateStr: string): string {
    const today = toDateStr(new Date());
    return dateStr > today ? today : dateStr;
}

export function getDateRangeFromFilter(filter: DateFilterValue): { start: string; end: string } {
    const { mode, year, quarter, month, dateRange } = filter;

    if (mode === 'custom' && dateRange[0] && dateRange[1]) {
        return { start: dateRange[0], end: capToToday(dateRange[1]) };
    }

    if (mode === 'month' && month !== null) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return { start: toDateStr(start), end: capToToday(toDateStr(end)) };
    }

    if (mode === 'quarter' && quarter !== null) {
        const sm = (quarter - 1) * 3;
        const start = new Date(year, sm, 1);
        const end = new Date(year, sm + 3, 0);
        return { start: toDateStr(start), end: capToToday(toDateStr(end)) };
    }

    // default: year
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return { start: toDateStr(start), end: capToToday(toDateStr(end)) };
}

export const defaultDateFilter: DateFilterValue = {
    mode: 'month',
    year: CUR_YR,
    quarter: null,
    month: CUR_MONTH,
    dateRange: [undefined, undefined],
};

const AdvancedDateFilter: React.FC<AdvancedDateFilterProps> = ({ title = 'Date Filter', value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverId = useRef(`adv-date-filter-${Math.random().toString(36).slice(2, 8)}`).current;
    const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Staged state user edits this inside the popover, only committed on Apply
    const [staged, setStaged] = useState<DateFilterValue>(value);

    // Sync staged state when popover opens
    useEffect(() => {
        if (isOpen) setStaged(value);
    }, [isOpen]);

    const updatePopoverPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const portalContainer = getPortalContainer();
            const portalRect = portalContainer.getBoundingClientRect();

            setPopoverCoords({
                top: rect.bottom - portalRect.top + portalContainer.scrollTop + 6,
                left: rect.right - portalRect.left + portalContainer.scrollLeft,
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePopoverPosition();

            const handleOutsideClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                if (!target.isConnected) return;
                if (
                    buttonRef.current?.contains(target) ||
                    document.getElementById(popoverId)?.contains(target) ||
                    target.closest('[data-portal-dropdown="true"]') ||
                    target.closest('[style*="z-index: 9999"]')
                ) {
                    return;
                }
                setIsOpen(false);
            };

            window.addEventListener('resize', updatePopoverPosition);
            document.addEventListener('mousedown', handleOutsideClick);

            return () => {
                window.removeEventListener('resize', updatePopoverPosition);
                document.removeEventListener('mousedown', handleOutsideClick);
            };
        }
    }, [isOpen, popoverId]);

    const filterLabel = useMemo(() => {
        switch (value.mode) {
            case 'year':
                return `Year: ${value.year}`;
            case 'quarter':
                return value.quarter ? `Q${value.quarter} ${value.year}` : `Quarter ${value.year}`;
            case 'month':
                return value.month !== null ? `${MONTHS[value.month]} ${value.year}` : `Month ${value.year}`;
            case 'custom':
                if (value.dateRange[0] && value.dateRange[1]) {
                    return `${dayjs(value.dateRange[0]).format('DD MMM YYYY')} To ${dayjs(value.dateRange[1]).format('DD MMM YYYY')}`;
                }
                return 'Custom Range';
            default:
                return `Year: ${value.year}`;
        }
    }, [value]);

    const isMonthInFuture = (yr: number, m: number) => yr > CUR_YR || (yr === CUR_YR && m > CUR_MONTH);
    const isQuarterInFuture = (yr: number, q: number) => {
        const firstMonthOfQuarter = (q - 1) * 3;
        return isMonthInFuture(yr, firstMonthOfQuarter);
    };

    // Staged selection handlers only update staged, don't close
    const stageYear = (y: number) => {
        setStaged({ mode: 'year', year: y, quarter: null, month: null, dateRange: [undefined, undefined] });
    };

    const stageQuarter = (q: number) => {
        setStaged((prev) => ({ ...prev, mode: 'quarter', quarter: q, month: null, dateRange: [undefined, undefined] }));
    };

    const stageMonth = (m: number) => {
        setStaged((prev) => ({ ...prev, mode: 'month', month: m, quarter: null, dateRange: [undefined, undefined] }));
    };

    const stageCustomRange = (dateRange: DateRangeValue) => {
        setStaged((prev) => ({ ...prev, mode: 'custom', quarter: null, month: null, dateRange }));
    };

    const handleApply = () => {
        if (staged.mode === 'custom' && (!staged.dateRange[0] || !staged.dateRange[1])) return;
        onChange(staged);
        setIsOpen(false);
    };

    const handleReset = () => {
        onChange(defaultDateFilter);
        setStaged(defaultDateFilter);
        setIsOpen(false);
    };

    const isNonDefault = value.mode !== defaultDateFilter.mode || value.year !== defaultDateFilter.year || value.month !== defaultDateFilter.month;

    // Can apply?
    const canApply = staged.mode !== 'custom' || (!!staged.dateRange[0] && !!staged.dateRange[1]);

    return (
        <>
            <style>{`
                @keyframes dateFilterPopoverIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateX(-100%) translateY(-0.25rem);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateX(-100%) translateY(0);
                    }
                }
                .animate-date-filter-popover {
                    animation: dateFilterPopoverIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }
            `}</style>

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer rounded-xl shadow-2xs border ring-1 ${
                    isOpen || isNonDefault
                        ? 'border-blue-500/40 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 ring-(--brand-color)/10'
                }`}
                title={title}
            >
                <CalendarDays size={13} className={isOpen || isNonDefault ? 'text-blue-600' : 'text-slate-500'} />
                <span className="truncate">{filterLabel}</span>
            </button>

            {isOpen &&
                createPortal(
                    <div
                        id={popoverId}
                        className="absolute z-9999 animate-date-filter-popover"
                        style={{
                            top: popoverCoords.top,
                            left: popoverCoords.left,
                        }}
                    >
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-3.5 w-[320px] max-h-[85vh] overflow-y-auto select-none">
                            {/* HEADER */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                                <span className="font-semibold text-slate-900 text-sm tracking-tight">{title}</span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-all cursor-pointer focus:outline-none"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canApply}
                                        onClick={handleApply}
                                        className="px-3 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 border border-transparent rounded-lg transition-all cursor-pointer focus:outline-none"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            {/* YEAR */}
                            <div className="mb-2.5">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Year</div>
                                <div className="flex gap-1.5">
                                    {YEARS.map((y) => {
                                        const isExactYearMode = staged.mode === 'year' && staged.year === y;
                                        const isActiveYear = staged.year === y && staged.mode !== 'custom';
                                        return (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={() => stageYear(y)}
                                                className={`flex-1 shadow-2xs py-1.5 leading-none rounded-lg text-[11px] font-bold border-none cursor-pointer text-center transition-colors ${
                                                    isExactYearMode
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : isActiveYear
                                                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {y}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* QUARTER */}
                            <div className="mb-2.5">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quarter</div>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4].map((q) => {
                                        const disabled = isQuarterInFuture(staged.year, q);
                                        const isExactQuarter = staged.mode === 'quarter' && staged.quarter === q;
                                        const isParentQuarter = staged.mode === 'month' && staged.month !== null && Math.floor(staged.month / 3) + 1 === q;
                                        return (
                                            <button
                                                key={q}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => stageQuarter(q)}
                                                className={`flex-1 shadow-2xs py-1.5 leading-none rounded-lg text-[11px] font-bold border-none text-center transition-colors ${
                                                    disabled
                                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                        : isExactQuarter
                                                          ? 'bg-blue-600 text-white shadow-sm cursor-pointer'
                                                          : isParentQuarter
                                                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 cursor-pointer'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                                                }`}
                                            >
                                                Q{q}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* MONTH */}
                            <div className="mb-2.5">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Month</div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {MONTHS.map((m, idx) => {
                                        const disabled = isMonthInFuture(staged.year, idx);
                                        const isSelected = staged.mode === 'month' && staged.month === idx;
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => stageMonth(idx)}
                                                className={`py-1.5 leading-none shadow-2xs rounded-lg text-[11px] font-bold border-none text-center transition-colors ${
                                                    disabled
                                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                        : isSelected
                                                          ? 'bg-blue-600 text-white shadow-sm cursor-pointer'
                                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CUSTOM RANGE */}
                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Custom Range</div>
                                <DateRangeInput value={staged.dateRange} onChange={stageCustomRange} placeholder="Select custom date range..." maxDate={new Date()} />
                            </div>
                        </div>
                    </div>,
                    getPortalContainer(),
                )}
        </>
    );
};

export default AdvancedDateFilter;
