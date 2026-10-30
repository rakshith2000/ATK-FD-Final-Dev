import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { createScheduledTask } from '../services/post-create-scheduled-task';
import { fetchServiceNowCis } from '../services/get-service-now-cis';
import { getValidToken, FASTEAI_LOGS_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { isSopItemArray, isCiItemArray } from '../typeguard/scheduler-type-guards';
import type { ScheduleTask, CreateTaskPayload, SopItem, CiItem, ApiError } from '../types/types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const useScheduleFormQuery = () => {
    const queryClient = useQueryClient();

    const sopsQuery = useQuery<SopItem[], ApiError>({
        queryKey: queryKeys.scheduler.sops(),
        queryFn: async () => {
            const activeToken = await getValidToken();
            const targetUrl = `${FASTEAI_LOGS_BASE}/sops`;

            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${activeToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`SOP fetch target failed context: ${response.status}`);
            }

            const res: unknown = await response.json();

            const rawSops: unknown = Array.isArray(res) ? res : isRecord(res) ? (Array.isArray(res.result) ? res.result : Array.isArray(res.data) ? res.data : []) : [];

            if (isSopItemArray(rawSops)) {
                const seen = new Set<string>();
                return rawSops.filter((sop) => {
                    const keyIdentifier = sop.sop_name || String(sop.id);
                    if (!keyIdentifier || seen.has(keyIdentifier)) return false;
                    seen.add(keyIdentifier);
                    return true;
                });
            }

            return [];
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const cisQuery = useQuery<CiItem[], ApiError>({
        queryKey: queryKeys.scheduler.cis(),
        queryFn: async () => {
            const res = await fetchServiceNowCis();
            const dataArray: unknown = Array.isArray(res) ? res : isRecord(res) ? (Array.isArray(res.result) ? res.result : Array.isArray(res.data) ? res.data : res) : res;

            if (isCiItemArray(dataArray)) {
                return dataArray.filter((ci: CiItem) => ci?.name);
            }

            return [];
        },
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const createTaskMutation = useMutation<ScheduleTask, ApiError, CreateTaskPayload>({
        mutationFn: createScheduledTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.tasks() });
            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.dashboard() });
        },
    });

    return {
        sops: sopsQuery.data || [],
        isLoadingSops: sopsQuery.isLoading,
        sopError: sopsQuery.error ? 'Failed to fetch SOPs.' : null,
        refetchSops: sopsQuery.refetch,
        cis: cisQuery.data || [],
        isLoadingCis: cisQuery.isLoading,
        createTaskMutation,
    };
};
