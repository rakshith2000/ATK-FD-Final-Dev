import { type FC, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

//  Constants

export const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

//  Helpers

export function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function parseDate(s: string | undefined): Date | null {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isBetween(d: Date, from: Date, to: Date): boolean {
    const t = d.getTime();
    return t > from.getTime() && t < to.getTime();
}

export interface CalendarDay {
    date: Date;
    dayOfMonth: number;
    isCurrentMonth: boolean;
}

export function getCalendarDays(year: number, month: number): CalendarDay[] {
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        days.push({ date: new Date(year, month - 1, d), dayOfMonth: d, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
        days.push({ date: new Date(year, month, d), dayOfMonth: d, isCurrentMonth: true });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
        for (let d = 1; d <= remaining; d++) {
            days.push({ date: new Date(year, month + 1, d), dayOfMonth: d, isCurrentMonth: false });
        }
    }

    return days;
}

//  MonthCalendar

export interface MonthCalendarProps {
    year: number;
    month: number;
    onPrev: () => void;
    onNext: () => void;
    /** Returns extra Tailwind classes for a given day. Used to style selection, range, hover preview, etc. */
    getDayClassName: (day: CalendarDay) => string;
    onDayClick: (d: Date) => void;
    onDayHover?: (d: Date | null) => void;
    disableNav?: 'prev' | 'next';
}

const MonthCalendar: FC<MonthCalendarProps> = ({ year, month, onPrev, onNext, getDayClassName, onDayClick, onDayHover, disableNav }) => {
    const days = useMemo(() => getCalendarDays(year, month), [year, month]);

    return (
        <div className="w-52.5 select-none">
            <div className="mb-1 flex items-center justify-between px-0.5">
                <button type="button" onClick={onPrev} disabled={disableNav === 'prev'} className="cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 disabled:invisible">
                    <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-semibold text-gray-700">
                    {MONTHS[month]} {year}
                </span>
                <button type="button" onClick={onNext} disabled={disableNav === 'next'} className="cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 disabled:invisible">
                    <ChevronRight size={14} />
                </button>
            </div>

            <div className="grid grid-cols-7 text-center">
                {DAYS.map((d) => (
                    <span key={d} className="py-0.5 text-[9px] font-medium text-gray-400">
                        {d}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7 text-center">
                {days.map((day, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => day.isCurrentMonth && onDayClick(day.date)}
                        onMouseEnter={() => day.isCurrentMonth && onDayHover?.(day.date)}
                        onMouseLeave={() => onDayHover?.(null)}
                        disabled={!day.isCurrentMonth}
                        className={twMerge('h-6.5 w-6.5 cursor-pointer justify-self-center text-[10px] leading-6.5 transition-colors', getDayClassName(day))}
                    >
                        {day.dayOfMonth}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MonthCalendar;
