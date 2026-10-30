import type { ScheduleTask } from '../types/types';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const checkScheduleRun = (t: ScheduleTask): boolean => {
    const sp = t.schedulePeriod || {};
    const startdata = sp.startdata || '';
    if (!startdata) return false;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (startdata > todayStr) return false;
    if (sp.enddate && sp.enddate < todayStr) return false;

    if (sp.daily) {
        const interval = Math.max(1, Number(sp.interval || sp.recurrenceInterval || 1));
        if (interval > 1) {
            const refStr = sp.last_run_date || startdata;
            try {
                const [ry, rm, rd] = refStr.split('-').map(Number);
                const refDate = new Date(ry, rm - 1, rd);
                const todayMidnight = new Date(year, today.getMonth(), Number(day));
                const diffDays = Math.floor((todayMidnight.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
                if (sp.last_run_date) {
                    return diffDays >= interval;
                } else {
                    return diffDays % interval === 0;
                }
            } catch {
                return true;
            }
        }
        return true;
    }

    if (sp.weekly) {
        const weekdayConfig = (sp.weekday || '').toLowerCase();
        const currentDayName = WEEKDAYS[today.getDay()];
        const currentDayIdx = String(today.getDay());

        return weekdayConfig === currentDayName || weekdayConfig === currentDayIdx;
    }

    if (sp.monthly) {
        if (sp.recurrencedate && sp.recurrencedate > 0) {
            return today.getDate() === sp.recurrencedate;
        }
        return false;
    }
    return startdata === todayStr;
};
