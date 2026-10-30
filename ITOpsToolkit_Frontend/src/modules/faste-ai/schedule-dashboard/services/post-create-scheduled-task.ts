import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import type { ScheduleTask } from '../types/types';

export const createScheduledTask = async (taskData: Omit<ScheduleTask, '_id'>): Promise<ScheduleTask> => {
    const res = await schedulerAxios.post('/group/', taskData);
    return res.data as ScheduleTask;
};
