import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

interface GroupWiseStats {
    count: number;
    value: string;
    label: string;
}

interface AssignmentGroupStatsProps {
    groupStats: Array<GroupWiseStats>;
    selectedDrilldownGroup?: string | null;
    selectedGroup?: string | null;
    onGroupToggle?: (group: string) => void;
    onGroupSelect?: (group: string | null) => void;
    hasActiveStateFilter?: boolean;
}

const AssignmentGroupStats: React.FC<AssignmentGroupStatsProps> = ({
    groupStats,
    onGroupToggle,
    onGroupSelect,
    selectedDrilldownGroup = null,
    selectedGroup = null,
    hasActiveStateFilter,
}) => {
    const selected = selectedDrilldownGroup ?? selectedGroup;
    const handleGroupAction = (group: string) => {
        if (onGroupToggle) {
            onGroupToggle(group);
        } else if (onGroupSelect) {
            onGroupSelect(selected === group ? null : group);
        }
    };
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
                    <div className="flex mx-auto gap-2.5 py-1 px-0.5 w-full">
                        {groupStats.map((group) => {
                            const isActive = selected === group.value;
                            const isMultiFilterActive = isActive && hasActiveStateFilter;
                            return (
                                <div
                                    key={group.label}
                                    role="button"
                                    tabIndex={0}
                                    className={`relative flex-none w-max min-w-28 flex flex-col items-center justify-between gap-1.5 rounded-xl border p-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer select-none ${
                                        isActive
                                            ? isMultiFilterActive
                                                ? 'border-purple-500/50 bg-purple-50/50 ring-2 ring-purple-500/20 shadow-xs'
                                                : 'border-blue-500/50 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                                    }`}
                                    onClick={() => handleGroupAction(group.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleGroupAction(group.value);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between w-full gap-1">
                                        <span className="text-lg font-extrabold text-slate-800 leading-none">{group.count}</span>
                                    </div>

                                    <p className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{group.label}</p>
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

export default AssignmentGroupStats;
