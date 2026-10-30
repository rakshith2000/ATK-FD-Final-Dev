import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import type { DashboardData, ScheduleTask, TaskStatus } from '../types/types';
import { checkAwaitingTask } from './check-awaiting-task';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const fetchDashboardData = async (): Promise<DashboardData> => {
    const res = await schedulerAxios.get('/group/');
    const rawData: unknown = res.data;

    const rawTasks = Array.isArray(rawData) ? rawData : isRecord(rawData) ? (Array.isArray(rawData.data) ? rawData.data : Array.isArray(rawData.tasks) ? rawData.tasks : []) : [];

    const tasks: ScheduleTask[] = rawTasks.map((t: { status?: string } & Record<string, unknown>) => {
        const normalized = t as unknown as ScheduleTask;
        return {
            ...normalized,
            status: (t.status === 'active' ? 'Scheduled' : t.status) as TaskStatus,
        };
    });

    const metrics = tasks.reduce(
        (acc, task) => {
            acc.total += 1;

            if (task.status === 'Scheduled') acc.scheduled += 1;
            if (task.status === 'Completed') acc.completed += 1;
            if (task.status === 'Failed') acc.failed += 1;
            if (task.status === 'Triggered') acc.triggered += 1;

            if (checkAwaitingTask(task)) {
                acc.awaiting += 1;
            }

            const towerLower = (task.tower || '').toLowerCase();
            if (towerLower === 'windows') acc.windows += 1;
            if (towerLower === 'linux') acc.linux += 1;
            if (towerLower === 'database') acc.database += 1;
            if (towerLower === 'network') acc.network += 1;
            if (towerLower === 'ticket audit') acc.ticketAudit += 1;

            return acc;
        },
        {
            total: 0,
            scheduled: 0,
            completed: 0,
            failed: 0,
            triggered: 0,
            awaiting: 0,
            windows: 0,
            linux: 0,
            database: 0,
            network: 0,
            ticketAudit: 0,
        },
    );

    return {
        metrics,
        tasks,
    };
};
