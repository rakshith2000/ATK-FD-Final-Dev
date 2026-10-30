import type { IncidentStatsResult } from '@/modules/major-incident-management/hooks/useIncidentStatsByPriorityAndGroupByState';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { ShieldAlert } from 'lucide-react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

interface StateAndPriorityStatsProps {
    stateStats: IncidentStatsResult['state_stats'];
    priorityStats: IncidentStatsResult['group_stats'];
    selectedState?: string | null;
    isAnyLocalFilterApplied: boolean;
    totalCount: number;
    onStateSelect?: (state: string | null) => void;
    combinedStatePriorityStats?: {
        [priority: string]: string | number;
        state: string;
        stateVal: string;
    }[];
    priorities: number[];
    isRefetching: boolean;
    refetch: () => void;
}
const StateAndPriorityStats: React.FC<StateAndPriorityStatsProps> = ({
    stateStats,
    onStateSelect,
    selectedState,
    isAnyLocalFilterApplied,
    combinedStatePriorityStats,
    priorities,
    isRefetching,
    totalCount,
    priorityStats,
    refetch,
}) => {
    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({ direction: 'horizontal', scrollDistance: 300 });

    return (
        <div className="h-full overflow-y-auto">
            {/* Scroll container with buttons aligned to cards */}
            <div className="flex items-center w-full relative">
                {/* Left button */}
                <button
                    onClick={() => scrollLeft()}
                    className={twMerge('absolute! left-0 shrink-0 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full z-10', !canScrollLeft ? 'opacity-0' : '')}
                >
                    <span>
                        <FaChevronLeft />
                    </span>
                </button>

                {/* Scroll container */}
                <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar flex-1">
                    <div className="flex mx-auto gap-3 py-1 px-0.5 w-full">
                        {/* Total Major Incidents Card */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onStateSelect?.(null)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onStateSelect?.(null);
                                }
                            }}
                            className={`p-3 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-w-max select-none ${
                                isAnyLocalFilterApplied
                                    ? 'bg-blue-50/50 border-blue-500/50 ring-2 ring-blue-500/20 shadow-xs'
                                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                            }`}
                        >
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-red-100/80 text-red-600 border border-red-200/70 shadow-2xs">
                                <ShieldAlert size={18} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[0.625rem] font-bold uppercase tracking-wider leading-none mb-1 text-slate-500">Total Major Incidents</span>
                                <span className="text-2xl font-extrabold leading-none text-slate-900">{totalCount}</span>
                                {priorityStats.length > 1 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
                                        {priorityStats.map((p) => {
                                            const pCount = p?.count;
                                            if (!pCount) return null;
                                            return (
                                                <span
                                                    key={p.value}
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded text-[0.6rem] font-bold text-slate-600 leading-none"
                                                    title={`Priority P${p?.label}`}
                                                >
                                                    <span>
                                                        P{p.value}: {pCount}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div onClick={(e) => e.stopPropagation()} className="ml-auto pl-1">
                                <RefetchButton isRefetching={isRefetching} onRefetch={refetch} />
                            </div>
                        </div>

                        {/* State breakdown cards */}
                        {stateStats.map((stat) => {
                            const isActive = selectedState === stat.value;
                            const stateCombinedData = (combinedStatePriorityStats?.find((s) => s.stateVal === stat.value) || {}) as Record<string, string | number>;

                            return (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    key={stat.value}
                                    onClick={() => onStateSelect?.(isActive ? null : stat.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onStateSelect?.(isActive ? null : stat.value);
                                        }
                                    }}
                                    className={`relative shadow-xs rounded-xl p-3 w-32 min-w-max cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md select-none flex flex-col justify-between ${
                                        isActive ? 'border-blue-500/50 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs' : 'bg-white border-slate-200/90 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-2xl font-extrabold text-slate-900 leading-none">{stat.count}</span>
                                    </div>

                                    <div className="flex flex-col gap-1 mt-auto">
                                        <p className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider truncate">{stat.label}</p>

                                        {priorities.length > 1 && (
                                            <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-slate-100">
                                                {priorities.map((pVal) => {
                                                    const pCount = stateCombinedData[String(pVal)] || 0;
                                                    if (!pCount) return null;
                                                    return (
                                                        <span
                                                            key={pVal}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded text-[0.6rem] font-bold text-slate-600 leading-none"
                                                            title={`Priority P${pVal}`}
                                                        >
                                                            <span>
                                                                P{pVal}: {pCount}
                                                            </span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right button */}
                <button
                    onClick={() => scrollRight()}
                    className={twMerge('absolute! right-0 shrink-0 cursor-pointer btn-split split-blue-light shadow p-2 rounded-full z-10', !canScrollRight ? 'opacity-0' : '')}
                >
                    <span>
                        <FaChevronRight />
                    </span>
                </button>
            </div>
        </div>
    );
};

export default StateAndPriorityStats;
