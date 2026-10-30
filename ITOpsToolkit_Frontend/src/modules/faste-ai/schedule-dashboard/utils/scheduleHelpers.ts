import type { SchedulePeriod, ScheduleTask, TaskStatus } from '../types/types';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const formatTimeStr = (timeStr?: string): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute} ${ampm}`;
};

const formatDateShort = (d: Date): string => {
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const parseDateOnly = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

export const getRecurrenceLabel = (sp?: Partial<SchedulePeriod>): string => {
    if (!sp) return 'One-time';

    const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));

    if (sp.daily) {
        return interval > 1 ? `Every ${interval} days` : 'Daily';
    }

    if (sp.weekly) {
        let dayName = (sp.weekday || '').trim();
        if (/^\d+$/.test(dayName)) {
            const idx = (parseInt(dayName, 10) - 1) % 7;
            dayName = WEEKDAYS[idx] || dayName;
        }
        const capDay = dayName ? dayName.charAt(0).toUpperCase() + dayName.slice(1) : 'Weekly';
        return interval > 1 ? `Every ${interval} wks (${capDay})` : `Weekly (${capDay})`;
    }

    if (sp.monthly) {
        if (sp.recurrencedate && sp.recurrencedate > 0) {
            return interval > 1 ? `Every ${interval} mos (Day ${sp.recurrencedate})` : `Monthly (Day ${sp.recurrencedate})`;
        }
        if (sp.weeknumber && sp.monthlyweekday) {
            const numName = ['1st', '2nd', '3rd', '4th', '5th'][sp.weeknumber - 1] || `#${sp.weeknumber}`;
            return interval > 1 ? `Every ${interval} mos (${numName} ${sp.monthlyweekday})` : `Monthly (${numName} ${sp.monthlyweekday})`;
        }
        return interval > 1 ? `Every ${interval} mos` : 'Monthly';
    }

    return 'One-time';
};

export const calculateNextRun = (sp?: Partial<SchedulePeriod>, status?: TaskStatus): string => {
    if (!sp || !sp.startdata) return '—';

    const isRecurring = Boolean(sp.daily || sp.weekly || sp.monthly || Number(sp.interval || sp.recurrenceInterval || 1) > 1);

    if (!isRecurring && (status === 'Completed' || status === 'Failed')) {
        return status;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (sp.enddate && sp.enddate.trim() !== '' && sp.enddate < todayStr) {
        return 'Expired';
    }

    const timeFormatted = formatTimeStr(sp.starttime);
    const startHour = sp.starttime ? parseInt(sp.starttime.split(':')[0], 10) : 0;
    const startMin = sp.starttime ? parseInt(sp.starttime.split(':')[1] || '0', 10) : 0;

    const isPastTimeToday = today.getHours() > startHour || (today.getHours() === startHour && today.getMinutes() >= startMin);

    if (sp.daily) {
        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        const lastRunStr = sp.last_run_date || '';
        let daysUntil = 0;

        if (lastRunStr === todayStr || isPastTimeToday) {
            daysUntil = interval;
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntil);

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        if (sp.enddate && sp.enddate.trim() !== '' && nextDateStr > sp.enddate) {
            return 'Expired';
        }

        return `${formatDateShort(nextDate)}, ${timeFormatted}`;
    }

    if (sp.weekly) {
        let targetWeekdayIdx = -1;
        const rawWeekday = (sp.weekday || '').trim().toLowerCase();
        if (/^\d+$/.test(rawWeekday)) {
            const jsDay = parseInt(rawWeekday, 10);
            targetWeekdayIdx = jsDay % 7;
        } else if (rawWeekday) {
            targetWeekdayIdx = WEEKDAYS.indexOf(rawWeekday);
        }

        if (targetWeekdayIdx === -1) {
            targetWeekdayIdx = today.getDay();
        }

        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        const lastRunStr = sp.last_run_date || '';
        const currentDayIdx = today.getDay();

        let daysUntil = (targetWeekdayIdx - currentDayIdx + 7) % 7;

        if (daysUntil === 0 && (lastRunStr === todayStr || isPastTimeToday)) {
            daysUntil = interval * 7;
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntil);

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        if (sp.enddate && sp.enddate.trim() !== '' && nextDateStr > sp.enddate) {
            return 'Expired';
        }

        return `${formatDateShort(nextDate)}, ${timeFormatted}`;
    }

    if (sp.monthly) {
        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        const targetDay = sp.recurrencedate && sp.recurrencedate > 0 ? sp.recurrencedate : today.getDate();

        const targetYear = today.getFullYear();
        let targetMonth = today.getMonth();

        const lastRunStr = sp.last_run_date || '';
        const isRunDoneOrPassedThisMonth = today.getDate() > targetDay || (today.getDate() === targetDay && (lastRunStr === todayStr || isPastTimeToday));

        if (isRunDoneOrPassedThisMonth) {
            targetMonth += interval;
        }

        const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const nextDate = new Date(targetYear, targetMonth, Math.min(targetDay, maxDaysInMonth));

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        if (sp.enddate && sp.enddate.trim() !== '' && nextDateStr > sp.enddate) {
            return 'Expired';
        }

        return `${formatDateShort(nextDate)}, ${timeFormatted}`;
    }

    const startDateObj = parseDateOnly(sp.startdata);
    if (!startDateObj) return '—';

    if (sp.startdata < todayStr || (sp.startdata === todayStr && isPastTimeToday)) {
        return status === 'Completed' ? 'Completed' : 'Past due';
    }

    return `${formatDateShort(startDateObj)}, ${timeFormatted}`;
};

export const getNextRunDate = (sp?: Partial<SchedulePeriod>, status?: TaskStatus): string => {
    return calculateNextRun(sp, status);
};

const getNextScheduleDate = (sp?: Partial<SchedulePeriod>): string | null => {
    if (!sp || !sp.startdata) return null;

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (sp.enddate && sp.enddate.trim() !== '' && sp.enddate < todayStr) {
        return null;
    }

    const startHour = sp.starttime ? parseInt(sp.starttime.split(':')[0], 10) : 0;
    const startMin = sp.starttime ? parseInt(sp.starttime.split(':')[1] || '0', 10) : 0;
    const isPastTimeToday = today.getHours() > startHour || (today.getHours() === startHour && today.getMinutes() >= startMin);

    if (sp.daily) {
        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        const lastRunStr = sp.last_run_date || '';
        let daysUntil = 0;

        if (lastRunStr === todayStr || isPastTimeToday) {
            daysUntil = interval;
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntil);

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        if (sp.enddate && sp.enddate.trim() !== '' && nextDateStr > sp.enddate) {
            return null;
        }

        return nextDateStr;
    }

    if (sp.weekly) {
        let targetWeekdayIdx = -1;
        const rawWeekday = (sp.weekday || '').trim().toLowerCase();
        if (/^\d+$/.test(rawWeekday)) {
            const jsDay = parseInt(rawWeekday, 10);
            targetWeekdayIdx = jsDay % 7;
        } else if (rawWeekday) {
            targetWeekdayIdx = WEEKDAYS.indexOf(rawWeekday);
        }

        if (targetWeekdayIdx === -1) {
            targetWeekdayIdx = today.getDay();
        }

        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        const lastRunStr = sp.last_run_date || '';
        const currentDayIdx = today.getDay();

        let daysUntil = (targetWeekdayIdx - currentDayIdx + 7) % 7;

        if (daysUntil === 0 && (lastRunStr === todayStr || isPastTimeToday)) {
            daysUntil = interval * 7;
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntil);

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        if (sp.enddate && sp.enddate.trim() !== '' && nextDateStr > sp.enddate) {
            return null;
        }

        return nextDateStr;
    }

    if (sp.monthly) {
        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        const targetDay = sp.recurrencedate && sp.recurrencedate > 0 ? sp.recurrencedate : today.getDate();

        const targetYear = today.getFullYear();
        let targetMonth = today.getMonth();

        const lastRunStr = sp.last_run_date || '';
        const isRunDoneOrPassedThisMonth = today.getDate() > targetDay || (today.getDate() === targetDay && (lastRunStr === todayStr || isPastTimeToday));

        if (isRunDoneOrPassedThisMonth) {
            targetMonth += interval;
        }

        const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const nextDate = new Date(targetYear, targetMonth, Math.min(targetDay, maxDaysInMonth));

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        if (sp.enddate && sp.enddate.trim() !== '' && nextDateStr > sp.enddate) {
            return null;
        }

        return nextDateStr;
    }

    return null;
};

export const matchesScheduleDate = (sp?: Partial<SchedulePeriod>, targetDate?: string | { startDate?: string; endDate?: string }): boolean => {
    if (!sp || !targetDate) return true;

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (typeof targetDate === 'string') {
        const startDateMatch = sp.startdata === targetDate;
        const lastRunMatch = sp.last_run_date === targetDate;

        const nextRunDateStr = getNextScheduleDate(sp);
        const nextRunMatch = nextRunDateStr === targetDate;

        return startDateMatch || lastRunMatch || nextRunMatch;
    }

    const { startDate, endDate } = targetDate;
    let dateToCheck = sp.startdata || sp.last_run_date;

    if (dateToCheck && dateToCheck < todayStr && (sp.daily || sp.weekly || sp.monthly)) {
        const nextRunDateStr = getNextScheduleDate(sp);
        if (nextRunDateStr) {
            dateToCheck = nextRunDateStr;
        }
    }

    if (!dateToCheck) return false;

    if (startDate && endDate) {
        return dateToCheck >= startDate && dateToCheck <= endDate;
    }
    if (startDate) {
        return dateToCheck >= startDate;
    }
    if (endDate) {
        return dateToCheck <= endDate;
    }

    return true;
};

export const getLastRunLabel = (sp?: Partial<SchedulePeriod>): string => {
    if (!sp?.last_run_date) return '—';
    const parsed = parseDateOnly(sp.last_run_date);
    return parsed ? formatDateShort(parsed) : sp.last_run_date;
};

export const hasExecutionReport = (task: ScheduleTask): boolean => {
    if (task.tower?.toLowerCase() === 'ticket audit') return false;
    if (task.status === 'Completed') return true;
    if (task.schedulePeriod?.last_run_date && task.reportType?.toLowerCase() === 'self download') {
        return true;
    }
    return false;
};
