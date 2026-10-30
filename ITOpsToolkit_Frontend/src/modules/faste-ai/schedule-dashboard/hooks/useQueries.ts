import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import type { DashboardData, CiItem, SopItem, ScheduleTask, CreateTaskPayload, ApiError } from '../types/types';

const fetchDashboardData = async (): Promise<DashboardData> => {
    throw new Error('Not implemented');
};
const fetchServiceNowCis = async (): Promise<CiItem[]> => {
    throw new Error('Not implemented');
};
const fetchSops = async (): Promise<SopItem[]> => {
    throw new Error('Not implemented');
};
const createScheduledTask = async (): Promise<ScheduleTask> => {
    throw new Error('Not implemented');
};

export const useDashboardData = () =>
    useQuery<DashboardData, ApiError>({
        queryKey: queryKeys.scheduler.dashboard(),
        queryFn: fetchDashboardData,
    });

export const useServiceNowCis = () =>
    useQuery<CiItem[], ApiError>({
        queryKey: queryKeys.scheduler.cis(),
        queryFn: fetchServiceNowCis,
        staleTime: 10 * 60 * 1000,
    });

export const useSops = () =>
    useQuery<SopItem[], ApiError>({
        queryKey: queryKeys.scheduler.sops(),
        queryFn: fetchSops,
    });

export const useCreateTaskMutation = () =>
    useMutation<ScheduleTask, ApiError, CreateTaskPayload>({
        mutationFn: createScheduledTask,
    });
