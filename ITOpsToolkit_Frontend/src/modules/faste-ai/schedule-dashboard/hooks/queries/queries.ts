import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../constants/queryKeys';
import { fetchDashboardData } from '../../services/fetch-dashboard-data';
import { fetchReportPreview } from '../../services/fetch-report-preview';
import { fetchServiceNowCis } from '../../services/get-service-now-cis';
import { fetchSops } from '../../services/fetch-sops';
import { createScheduledTask } from '../../services/post-create-scheduled-task';
import { isCiItemArray, isSopItemArray } from '../../typeguard/scheduler-type-guards';
import type { DashboardData, ReportData, CiItem, SopItem, ScheduleTask, CreateTaskPayload, ApiError } from '../../types/types';

export const useDashboardData = () => {
    return useQuery<DashboardData, ApiError>({
        queryKey: queryKeys.scheduler.dashboard(),
        queryFn: fetchDashboardData,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useReportPreview = (taskId: string, enabled: boolean) => {
    return useQuery<ReportData, ApiError>({
        queryKey: queryKeys.scheduler.reportPreview(taskId),
        queryFn: () => fetchReportPreview(taskId),
        enabled: enabled,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useServiceNowCis = (enabled = true) => {
    return useQuery<CiItem[], ApiError>({
        queryKey: queryKeys.scheduler.cis(),
        queryFn: async () => {
            const res = await fetchServiceNowCis();
            const dataArray: unknown = Array.isArray(res)
                ? res
                : res && typeof res === 'object'
                  ? ((res as { result?: unknown; data?: unknown }).result ?? (res as { result?: unknown; data?: unknown }).data ?? res)
                  : res;

            if (isCiItemArray(dataArray)) {
                return dataArray.filter((ci: CiItem) => ci?.name);
            }
            return [];
        },
        enabled: enabled,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useSops = () =>
    useQuery<SopItem[], ApiError>({
        queryKey: queryKeys.scheduler.sops(),
        queryFn: async () => {
            const res = await fetchSops();
            if (isSopItemArray(res)) {
                return res;
            }
            return [];
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

export const useCreateTaskMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<ScheduleTask, ApiError, CreateTaskPayload>({
        mutationFn: createScheduledTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.tasks() });
            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.dashboard() });
        },
    });
};
