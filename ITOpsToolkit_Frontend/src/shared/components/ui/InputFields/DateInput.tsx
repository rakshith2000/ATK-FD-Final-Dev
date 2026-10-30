import { type FC, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';
import { Calendar, Clock, X } from 'lucide-react';
import dayjs from 'dayjs';
import MonthCalendar, { toDateStr, parseDate, isSameDay, type CalendarDay } from './shared/Calendar';

// --- Types -----------------------------------------------------------------

export interface DateInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    error?: boolean;
    disabled?: boolean;
    placeholder?: string;
    /** @deprecated Use minDate instead */
    min?: string | Date;
    /** @deprecated Use maxDate instead */
    max?: string | Date;
    minDate?: Date;
    maxDate?: Date;
    className?: string;
    triggerClassName?: string;
    time?: boolean;
}

// --- Helpers ---------------------------------------------------------------

/**
 * Reusable utility function to format date / datetime string for display using dayjs.
 * Formats date as "DD MMM YYYY" (e.g. "08 Aug 2026") or "DD MMM YYYY HH:mm:ss" when time is true.
 */
export function getDisplayValue(value: string | Date | undefined | null, time?: boolean): string {
    if (!value) return '';
    const d = dayjs(value);
    if (!d.isValid()) return String(value);

    return time ? d.format('DD MMM YYYY HH:mm:ss') : d.format('DD MMM YYYY');
}

export const displayValue = getDisplayValue;
export const formatDisplayValue = getDisplayValue;

function parseInputDate(s: string | undefined): Date | null {
    if (!s) return null;
    const datePart = s.trim().split(/[ T]/)[0];
    return parseDate(datePart);
}

function resolveDate(val: string | Date | undefined): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    return parseInputDate(val);
}

function parseTimeParts(val: string | undefined): { hours: string; minutes: string; seconds: string } {
    if (!val) return { hours: '00', minutes: '00', seconds: '00' };
    const parts = val.trim().split(/[ T]/);
    const timePart = parts[1] || '';
    if (!timePart) return { hours: '00', minutes: '00', seconds: '00' };

    const tParts = timePart.split(':');
    const hours = tParts[0] ? tParts[0].padStart(2, '0').slice(0, 2) : '00';
    const minutes = tParts[1] ? tParts[1].padStart(2, '0').slice(0, 2) : '00';
    const rawSec = tParts[2] ? tParts[2].replace(/[^0-9].*$/, '') : '00';
    const seconds = rawSec ? rawSec.padStart(2, '0').slice(0, 2) : '00';

    return { hours, minutes, seconds };
}

function extractDateStr(val: string | undefined): string {
    if (!val) return '';
    return val.trim().split(/[ T]/)[0] || '';
}

interface TimeSegmentInputProps {
    value: string;
    max: number;
    onChange: (val: string) => void;
    ariaLabel: string;
}

const TimeSegmentInput: FC<TimeSegmentInputProps> = ({ value, max, onChange, ariaLabel }) => {
    const [localVal, setLocalVal] = useState(value);
    const isFocusedRef = useRef(false);

    useEffect(() => {
        if (!isFocusedRef.current) {
            setLocalVal(value);
        }
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        isFocusedRef.current = true;
        e.target.select();
    };

    const handleBlur = () => {
        isFocusedRef.current = false;
        let num = parseInt(localVal || '0', 10);
        if (isNaN(num)) num = 0;
        if (num > max) num = max;
        const formatted = String(num).padStart(2, '0');
        setLocalVal(formatted);
        onChange(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        let num = parseInt(localVal || '0', 10);
        if (isNaN(num)) num = 0;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = (num + 1) % (max + 1);
            const formatted = String(next).padStart(2, '0');
            setLocalVal(formatted);
            onChange(formatted);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const prev = (num - 1 + (max + 1)) % (max + 1);
            const formatted = String(prev).padStart(2, '0');
            setLocalVal(formatted);
            onChange(formatted);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        if (!raw) {
            setLocalVal('');
            onChange('00');
            return;
        }

        const rawString = raw.slice(-2);
        let parsedNum = parseInt(rawString, 10);
        if (isNaN(parsedNum)) parsedNum = 0;
        if (parsedNum > max) parsedNum = max;

        const displayStr = String(parsedNum);
        setLocalVal(displayStr);

        const formatted = String(parsedNum).padStart(2, '0');
        onChange(formatted);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
        e.preventDefault();
        let num = parseInt(localVal || '0', 10);
        if (isNaN(num)) num = 0;
        let next = num;
        if (e.deltaY < 0) {
            next = (num + 1) % (max + 1);
        } else if (e.deltaY > 0) {
            next = (num - 1 + (max + 1)) % (max + 1);
        }
        const formatted = String(next).padStart(2, '0');
        setLocalVal(formatted);
        onChange(formatted);
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            aria-label={ariaLabel}
            value={localVal}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onWheel={handleWheel}
            maxLength={2}
            className="w-9 rounded border border-gray-300 bg-white py-0.5 text-center font-mono text-xs font-medium text-gray-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
    );
};

// --- Styles ----------------------------------------------------------------

const baseClasses = 'flex w-full cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-left text-xs transition-colors';
const focusClasses = 'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500';
const disabledClasses = 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none';

// --- Component -------------------------------------------------------------

const DateInput: FC<DateInputProps> = ({
    value = '',
    onChange,
    onBlur,
    onFocus,
    error,
    disabled,
    placeholder,
    min,
    max,
    minDate,
    maxDate,
    className,
    triggerClassName,
    time = false,
}) => {
    const defaultPlaceholder = placeholder || (time ? 'Select date & time...' : 'Select date...');
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const disabledRef = useRef(disabled);
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const selectedDate = parseInputDate(value);
    const resolvedMinDate = resolveDate(minDate ?? min);
    const resolvedMaxDate = resolveDate(maxDate ?? max);

    const now = new Date();
    const initialMonth = selectedDate ?? now;
    const [viewMonth, setViewMonth] = useState({ year: initialMonth.getFullYear(), month: initialMonth.getMonth() });

    const [selectedTime, setSelectedTime] = useState<{ hours: string; minutes: string; seconds: string }>(() => parseTimeParts(value));

    // Sync state when value changes externally
    useEffect(() => {
        if (selectedDate) {
            setViewMonth({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() });
        }
        if (value) {
            setSelectedTime(parseTimeParts(value));
        }
    }, [value]);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const popoverWidth = popoverRef.current ? popoverRef.current.offsetWidth : 240;
        const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : time ? 350 : 280;

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
    }, [time]);

    const closePicker = useCallback(() => {
        setIsOpen(false);
        onBlur?.();
    }, [onBlur]);

    useClickOutside([triggerRef, popoverRef], closePicker, isOpen);

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

    const prevMonth = useCallback(() => {
        setViewMonth((prev) => {
            const d = new Date(prev.year, prev.month - 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }, []);

    const nextMonth = useCallback(() => {
        setViewMonth((prev) => {
            const d = new Date(prev.year, prev.month + 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }, []);

    const handleDayClick = useCallback(
        (d: Date) => {
            if (disabledRef.current) return;
            if (resolvedMinDate && d.getTime() < resolvedMinDate.getTime()) return;
            if (resolvedMaxDate && d.getTime() > resolvedMaxDate.getTime()) return;

            const dateStr = toDateStr(d);
            if (time) {
                const fullValue = `${dateStr} ${selectedTime.hours}:${selectedTime.minutes}:${selectedTime.seconds}`;
                onChange?.(fullValue);
            } else {
                onChange?.(dateStr);
                setIsOpen(false);
                onBlur?.();
            }
        },
        [onChange, onBlur, resolvedMinDate, resolvedMaxDate, time, selectedTime],
    );

    const handleSelectToday = useCallback(() => {
        if (disabledRef.current) return;
        const todayDate = new Date();
        setViewMonth({ year: todayDate.getFullYear(), month: todayDate.getMonth() });

        const dateStr = toDateStr(todayDate);
        if (time) {
            const fullValue = `${dateStr} ${selectedTime.hours}:${selectedTime.minutes}:${selectedTime.seconds}`;
            onChange?.(fullValue);
        } else {
            onChange?.(dateStr);
            setIsOpen(false);
            onBlur?.();
        }
    }, [time, selectedTime, onChange, onBlur]);

    const handleTimeChange = useCallback(
        (newHours: string, newMinutes: string, newSeconds: string) => {
            const newTime = { hours: newHours, minutes: newMinutes, seconds: newSeconds };
            setSelectedTime(newTime);
            if (time) {
                const dateStr = extractDateStr(value);
                if (dateStr) {
                    const fullValue = `${dateStr} ${newHours}:${newMinutes}:${newSeconds}`;
                    onChange?.(fullValue);
                }
            }
        },
        [time, value, onChange],
    );

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (disabledRef.current) return;
            onChange?.('');
            setSelectedTime({ hours: '00', minutes: '00', seconds: '00' });
            onBlur?.();
        },
        [onChange, onBlur],
    );

    const today = useMemo(() => new Date(), []);

    const getDayClassName = useCallback(
        (day: CalendarDay): string => {
            if (!day.isCurrentMonth) return 'text-gray-300';

            const d = day.date;

            // Disabled by min/max
            if (resolvedMinDate && d.getTime() < resolvedMinDate.getTime()) return 'text-gray-300 cursor-not-allowed';
            if (resolvedMaxDate && d.getTime() > resolvedMaxDate.getTime()) return 'text-gray-300 cursor-not-allowed';

            // Selected
            if (selectedDate && isSameDay(d, selectedDate)) return 'bg-blue-600 text-white font-semibold rounded';

            // Today
            if (isSameDay(d, today)) return 'font-semibold text-blue-600';

            return 'text-gray-700 hover:bg-gray-100 rounded';
        },
        [selectedDate, today, resolvedMinDate, resolvedMaxDate],
    );

    const hasValue = !!value;
    const dateStr = extractDateStr(value);
    const rawValToDisplay = hasValue ? (time ? `${dateStr} ${selectedTime.hours}:${selectedTime.minutes}:${selectedTime.seconds}` : value) : '';
    const displayValueStr = getDisplayValue(rawValToDisplay, time);

    if (disabled) {
        return (
            <div className={twMerge(baseClasses, disabledClasses, className)}>
                <Calendar size={12} className="shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate">{displayValueStr || 'No date'}</span>
            </div>
        );
    }

    return (
        <div className={twMerge('relative w-full', className)}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                    if (!isOpen) {
                        updatePosition();
                        onFocus?.();
                    }
                    setIsOpen((v) => !v);
                }}
                className={twMerge(baseClasses, focusClasses, error && errorClasses, triggerClassName)}
            >
                <Calendar size={12} className="shrink-0 text-gray-400" />
                {hasValue ? (
                    <span className="min-w-0 flex-1 truncate text-gray-700">{displayValueStr}</span>
                ) : (
                    <span className="min-w-0 flex-1 truncate text-gray-300">{defaultPlaceholder}</span>
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
                            <button
                                type="button"
                                onClick={handleSelectToday}
                                className="cursor-pointer text-[10px] font-semibold text-blue-600 transition-colors hover:text-blue-800"
                            >
                                Today
                            </button>
                            {hasValue && (
                                <button type="button" onClick={handleClear} className="cursor-pointer text-[10px] text-red-500 transition-colors hover:text-red-700">
                                    Clear
                                </button>
                            )}
                        </div>

                        <MonthCalendar
                            year={viewMonth.year}
                            month={viewMonth.month}
                            onPrev={prevMonth}
                            onNext={nextMonth}
                            getDayClassName={getDayClassName}
                            onDayClick={handleDayClick}
                        />

                        {time && (
                            <div className="mt-2.5 border-t border-gray-100 pt-2.5">
                                <div className="mb-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                                        <Clock size={12} className="text-gray-400" />
                                        <span>Time (24h)</span>
                                    </div>
                                    <span className="font-mono text-[9px] text-gray-400">HH : MM : SS</span>
                                </div>
                                <div className="flex items-center justify-center gap-1 rounded border border-gray-200 bg-gray-50 p-1.5">
                                    <TimeSegmentInput
                                        value={selectedTime.hours}
                                        max={23}
                                        onChange={(h) => handleTimeChange(h, selectedTime.minutes, selectedTime.seconds)}
                                        ariaLabel="Hours"
                                    />
                                    <span className="select-none font-mono text-xs font-semibold text-gray-400">:</span>
                                    <TimeSegmentInput
                                        value={selectedTime.minutes}
                                        max={59}
                                        onChange={(m) => handleTimeChange(selectedTime.hours, m, selectedTime.seconds)}
                                        ariaLabel="Minutes"
                                    />
                                    <span className="select-none font-mono text-xs font-semibold text-gray-400">:</span>
                                    <TimeSegmentInput
                                        value={selectedTime.seconds}
                                        max={59}
                                        onChange={(s) => handleTimeChange(selectedTime.hours, selectedTime.minutes, s)}
                                        ariaLabel="Seconds"
                                    />
                                </div>
                            </div>
                        )}

                        {time ? (
                            <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2">
                                <span className="font-mono text-[10px] text-gray-500">{displayValueStr || 'Select date above'}</span>
                                <button
                                    type="button"
                                    onClick={closePicker}
                                    className="cursor-pointer rounded bg-blue-600 px-2.5 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-blue-700"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            hasValue && <div className="mt-2 border-t border-gray-100 pt-2 text-center text-[10px] text-gray-500">{displayValueStr}</div>
                        )}
                    </div>,
                    getPortalContainer(),
                )}
        </div>
    );
};

DateInput.displayName = 'DateInput';

export default DateInput;
