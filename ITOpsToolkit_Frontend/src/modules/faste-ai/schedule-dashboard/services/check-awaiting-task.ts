import type { ScheduleTask } from '../types/types';
import { checkScheduleRun } from './check-schedule-run';

export const checkAwaitingTask = (t: ScheduleTask): boolean => {
    if (t.status === 'Awaiting') return true;
    if (t.status === 'Scheduled') return checkScheduleRun(t);
    return false;
};
