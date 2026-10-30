import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import type { DashboardMetrics, ScheduleTask, ScheduleState } from '../../../types/types';

export interface MetricCardItem {
    id: string;
    label: string;
    value: number;
    status?: string;
}

export interface MetricCardProps {
    item: MetricCardItem;
    isActive?: boolean;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    className?: ClassNameValue;
    valueClassName?: ClassNameValue;
    labelClassName?: ClassNameValue;
    accent?: string;
}

interface MetricCardsProps {
    metrics: DashboardMetrics;
    tasks: ScheduleTask[];
    setShowActiveSchedules?: (show: boolean) => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ item, isActive = false, onClick, onMouseEnter, onMouseLeave, className, valueClassName, labelClassName, accent }) => {
    return (
        <div
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                borderColor: !isActive ? accent || 'rgb(187, 221, 255)' : undefined,
            }}
            className={twMerge(
                'shrink-0 min-w-40 h-16 rounded-[10px] flex items-center px-3.5 transition-[background-color] duration-200 shadow-sm border',
                isActive ? 'bg-blue-100/70 border-blue-300' : 'bg-white hover:bg-blue-100/30 hover:border-blue-300/50',
                onClick ? 'cursor-pointer' : 'cursor-default',
                className,
            )}
        >
            <div className={twMerge('text-2xl font-extrabold text-blue-950 mr-2.5', valueClassName)}>{item.value}</div>
            <div className={twMerge('text-xs font-semibold text-gray-800 leading-tight', labelClassName)}>{item.label}</div>
        </div>
    );
};

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, tasks, setShowActiveSchedules }) => {
    const navigate = useNavigate();
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

    const { scrollContainerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useScrollOverflow({
        direction: 'horizontal',
        scrollDistance: 300,
    });

    const getCount = (key: string, val: string) => {
        if (key === 'status') {
            switch (val.toLowerCase()) {
                case 'scheduled':
                    return metrics.scheduled;
                case 'completed':
                    return metrics.completed;
                case 'failed':
                    return metrics.failed;
                case 'triggered':
                    return metrics.triggered;
                default:
                    return 0;
            }
        }
        return 0;
    };

    const cards = [
        { label: 'Scheduled', count: metrics.scheduled, key: 'status', val: 'Scheduled' },
        { label: 'Completed', count: metrics.completed, key: 'status', val: 'Completed' },
        { label: 'Failed', count: metrics.failed, key: 'status', val: 'Failed' },
        { label: 'Triggered', count: metrics.triggered, key: 'status', val: 'Triggered' },
        { label: 'Awaiting', count: metrics.awaiting, key: 'awaiting', val: 'Awaiting' },
        {
            label: 'Active Schedules',
            count: getCount('status', 'Triggered'),
            key: 'active',
            val: 'schedules',
            accent: '#7c3aed',
            onCardClick: () => setShowActiveSchedules?.(true),
        },
    ];

    const handleCardClick = (card: (typeof cards)[number]) => {
        if (card.onCardClick) {
            card.onCardClick();
            return;
        }

        const partialState: ScheduleState = {
            filterKey: card.key,
            filterValue: card.val,
            tasks: tasks,
        };

        navigate({
            to: '/faste-ai/schedule-dashboard/schedule-details',
            state: (prev) => ({
                ...prev,
                ...partialState,
            }),
        });
    };

    return (
        <div className="relative flex items-center mb-4 w-full select-none">
            <button
                onClick={() => scrollLeft()}
                disabled={!canScrollLeft}
                className={twMerge(
                    'w-7 h-7 flex items-center justify-center border border-blue-200 rounded-lg bg-white text-blue-900 shadow-sm hover:bg-slate-50 transition-all mr-1.5 active:scale-95 shrink-0 cursor-pointer',
                    !canScrollLeft && 'opacity-0 pointer-events-none',
                )}
                aria-label="Scroll left"
                type="button"
            >
                <ChevronLeft size={16} />
            </button>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto scroll-smooth flex-1 py-1 no-scrollbar gap-2.5"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {cards.map((card) => {
                    const id = `${card.key}-${card.val}`;
                    return (
                        <MetricCard
                            key={id}
                            item={{
                                id,
                                label: card.label,
                                value: card.count,
                                status: card.val,
                            }}
                            accent={card.accent}
                            isActive={hoveredCardId === id}
                            onClick={() => handleCardClick(card)}
                            onMouseEnter={() => setHoveredCardId(id)}
                            onMouseLeave={() => setHoveredCardId(null)}
                        />
                    );
                })}
            </div>

            <button
                onClick={() => scrollRight()}
                disabled={!canScrollRight}
                className={twMerge(
                    'w-7 h-7 flex items-center justify-center border border-blue-200 rounded-lg bg-white text-blue-900 shadow-sm hover:bg-slate-50 transition-all ml-1.5 active:scale-95 shrink-0 cursor-pointer',
                    !canScrollRight && 'opacity-0 pointer-events-none',
                )}
                aria-label="Scroll right"
                type="button"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
};
