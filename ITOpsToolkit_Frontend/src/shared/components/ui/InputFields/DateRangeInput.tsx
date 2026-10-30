import { type FC, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';
import { Calendar, X } from 'lucide-react';
import MonthCalendar, { toDateStr, parseDate, isSameDay, isBetween, type CalendarDay } from './shared/Calendar';
import dayjs from 'dayjs';

// Types

export type DateRangeValue = [string | undefined, string | undefined];

export interface DateRangeInputProps {
    value?: DateRangeValue;
    onChange?: (value: DateRangeValue) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    error?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
    /** Maximum selectable date (inclusive). Days after this are disabled. */
    maxDate?: Date;
}

//  Helpers

function formatDateRangeDisplay(from: string | undefined, to: string | undefined): ReactNode {
    if (!from && !to) return <></>;
    if (from && to)
        return (
            <>
                {dayjs(from).format('DD MMM YYYY')} To {dayjs(to).format('DD MMM YYYY')}
            </>
        );
    if (from) return <>{dayjs(from).format('DD MMM YYYY')} To ?</>;
    return <>? To {dayjs(to).format('DD MMM YYYY')}</>;
}

//  Styles

const baseClasses = 'flex w-full cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-left text-xs transition-colors';
const focusClasses = 'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500';
const disabledClasses = 'bg-gray-50 text-gray-500 cursor-default pointer-events-none';
const activeClasses = 'border-blue-300 bg-blue-50/50';

//  Component
const DateRangeInput: FC<DateRangeInputProps> = ({
    value = [undefined, undefined],
    onChange,
    onBlur,
    onFocus,
    error,
    disabled,
    placeholder = 'Select dates...',
    className,
    triggerClassName,
    maxDate,
}) => {
    const [from, to] = value;
    const [isOpen, setIsOpen] = useState(false);

    const disabledRef = useRef(disabled);
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [selectingPhase, setSelectingPhase] = useState<'from' | 'to'>('from');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [isCompact, setIsCompact] = useState(false);

    const now = new Date();
    const [leftMonth, setLeftMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const [rightMonth, setRightMonth] = useState(() => {
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { year: next.getFullYear(), month: next.getMonth() };
    });

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const compact = vw < 500;
        setIsCompact(compact);

        const popover = popoverRef.current;
        const popoverWidth = popover ? popover.offsetWidth : compact ? 240 : 460;
        const popoverHeight = popover ? popover.offsetHeight : compact ? 340 : 320;

        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;

        let top: number;
        if (spaceBelow >= popoverHeight + 4) {
            top = rect.bottom + 4;
        } else if (spaceAbove >= popoverHeight + 4) {
            top = rect.top - popoverHeight - 4;
        } else {
            top = Math.max(4, Math.min(rect.bottom + 4, vh - popoverHeight - 4));
        }

        let left = rect.left;
        if (left + popoverWidth > vw - 4) {
            left = Math.max(4, vw - popoverWidth - 4);
        }

        setPopoverPos({ top, left });
    }, []);

    const closeDatePicker = useCallback(() => {
        setIsOpen(false);
        onBlur?.();
    }, [onBlur]);

    useClickOutside([triggerRef, popoverRef], closeDatePicker, isOpen);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const raf = requestAnimationFrame(updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    const advanceLeft = useCallback(() => {
        setLeftMonth((prev) => {
            const d = new Date(prev.year, prev.month - 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
        setRightMonth((prev) => {
            const d = new Date(prev.year, prev.month - 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }, []);

    const advanceRight = useCallback(() => {
        setLeftMonth((prev) => {
            const d = new Date(prev.year, prev.month + 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
        setRightMonth((prev) => {
            const d = new Date(prev.year, prev.month + 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }, []);

    const handleDayClick = useCallback(
        (d: Date) => {
            if (disabledRef.current) return;
            if (maxDate && d.getTime() > maxDate.getTime()) return;
            const dateStr = toDateStr(d);

            if (selectingPhase === 'from') {
                onChange?.([dateStr, undefined]);
                setSelectingPhase('to');
            } else {
                const currentFrom = parseDate(value[0]);
                if (currentFrom && d.getTime() < currentFrom.getTime()) {
                    onChange?.([dateStr, value[0]]);
                } else {
                    onChange?.([value[0], dateStr]);
                }
                setSelectingPhase('from');
                setIsOpen(false);
                onBlur?.();
            }
        },
        [selectingPhase, value, onChange, onBlur],
    );

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (disabledRef.current) return;
            onChange?.([undefined, undefined]);
            setSelectingPhase('from');
        },
        [onChange],
    );

    const getDayClassName = useCallback(
        (day: CalendarDay): string => {
            if (!day.isCurrentMonth) return 'text-gray-300';

            const d = day.date;
            const today = new Date();

            if (maxDate && d.getTime() > maxDate.getTime()) return 'text-gray-300 cursor-not-allowed';

            const isFrom = fromDate && isSameDay(d, fromDate);
            const isTo = toDate && isSameDay(d, toDate);
            const isToday = isSameDay(d, today);

            if (isFrom || isTo) return 'bg-blue-600 text-white font-semibold rounded';

            if (fromDate && toDate && isBetween(d, fromDate, toDate)) return 'bg-blue-100 text-blue-800';

            if (fromDate && !toDate && hoverDate) {
                const previewFrom = fromDate.getTime() < hoverDate.getTime() ? fromDate : hoverDate;
                const previewTo = fromDate.getTime() < hoverDate.getTime() ? hoverDate : fromDate;
                if (isBetween(d, previewFrom, previewTo)) return 'bg-blue-50 text-blue-600';
                if (isSameDay(d, hoverDate)) return 'bg-blue-100 text-blue-700 rounded';
            }

            if (isToday) return 'font-semibold text-blue-600';

            return 'text-gray-700 hover:bg-gray-100 rounded';
        },
        [fromDate, toDate, hoverDate, maxDate],
    );

    const displayValue = formatDateRangeDisplay(from, to);
    const hasValue = !!(from || to);

    if (disabled) {
        const display = from && to ? `${from} – ${to}` : from ? `${from} ->` : to ? `-> ${to}` : 'No date range';
        return (
            <div className={twMerge(baseClasses, disabledClasses, className)}>
                <Calendar size={12} className="shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate">{display}</span>
            </div>
        );
    }

    return (
        <div className={twMerge('relative', className)}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                    if (!isOpen) {
                        updatePosition();
                        onFocus?.();
                    }
                    setIsOpen((v) => !v);
                    if (!isOpen && !from) setSelectingPhase('from');
                }}
                className={twMerge(baseClasses, focusClasses, error && errorClasses, hasValue && activeClasses, triggerClassName)}
            >
                <Calendar size={12} className="shrink-0 text-gray-400" />
                {hasValue ? (
                    <span className="min-w-0 flex-1 truncate text-gray-700">{displayValue}</span>
                ) : (
                    <span className="min-w-0 flex-1 truncate text-gray-300">{placeholder}</span>
                )}
                {hasValue && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                        className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                        <X size={10} />
                    </span>
                )}
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
                        className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">{selectingPhase === 'from' ? 'Select start date' : 'Select end date'}</span>
                            {hasValue && (
                                <button type="button" onClick={handleClear} className="cursor-pointer text-[10px] text-red-500 hover:text-red-700">
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className={isCompact ? 'flex flex-col gap-2' : 'flex gap-3'}>
                            <MonthCalendar
                                year={leftMonth.year}
                                month={leftMonth.month}
                                onPrev={advanceLeft}
                                onNext={advanceRight}
                                getDayClassName={getDayClassName}
                                onDayClick={handleDayClick}
                                onDayHover={setHoverDate}
                                disableNav="next"
                            />
                            {!isCompact && <div className="w-px bg-gray-200" />}
                            {isCompact && <div className="h-px bg-gray-200" />}
                            <MonthCalendar
                                year={rightMonth.year}
                                month={rightMonth.month}
                                onPrev={advanceLeft}
                                onNext={advanceRight}
                                getDayClassName={getDayClassName}
                                onDayClick={handleDayClick}
                                onDayHover={setHoverDate}
                                disableNav="prev"
                            />
                        </div>

                        {hasValue && <div className="mt-2 border-t border-gray-100 pt-2 text-center text-[10px] text-gray-500">{displayValue}</div>}
                    </div>,
                    getPortalContainer(),
                )}
        </div>
    );
};

DateRangeInput.displayName = 'DateRangeInput';

export default DateRangeInput;
