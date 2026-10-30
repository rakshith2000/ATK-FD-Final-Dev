import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import { queryKeys } from '../constants/queryKeys';
import type { ScheduleTask, TaskStatus, ApiError } from '../types/types';

export const useScheduleMutations = (onEditSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

    const updateTaskMutation = useMutation<ScheduleTask, ApiError, ScheduleTask>({
        mutationFn: async (updatedTask: ScheduleTask) => {
            await schedulerAxios.put(`/group/${updatedTask._id}`, {
                taskName: updatedTask.taskName,
                description: updatedTask.description,
                tower: updatedTask.tower,
                sop: updatedTask.sop,
                reportType: updatedTask.reportType,
                reportFormat: updatedTask.reportFormat,
                ticketRequired: updatedTask.ticketRequired,
                ciItems: updatedTask.ciItems,
                schedulePeriod: {
                    ...updatedTask.schedulePeriod,
                    starttime: updatedTask.schedulePeriod?.starttime?.length === 5 ? updatedTask.schedulePeriod.starttime + ':00' : updatedTask.schedulePeriod?.starttime || '',
                },
                status: updatedTask.status,
            });
            return updatedTask;
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ScheduleTask[]>(queryKeys.scheduler.tasks(), (old) => {
                return old ? old.map((t) => (t._id === data._id ? data : t)) : [];
            });

            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.dashboard() });

            if (onEditSuccess) onEditSuccess();
        },
    });

    const runTaskMutation = useMutation<ScheduleTask, ApiError, ScheduleTask>({
        mutationFn: async (item: ScheduleTask) => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');

            const immediateSchedulePeriod = {
                ...(item.schedulePeriod || {}),
                startdata: today,
                starttime: `${hh}:${mm}:${ss}`,
                trigger_requested: true,
            };

            await schedulerAxios.put(`/group/${item._id}`, {
                status: 'Triggered',
                schedulePeriod: immediateSchedulePeriod,
            });
            return { ...item, status: 'Triggered' as TaskStatus, schedulePeriod: immediateSchedulePeriod };
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ScheduleTask[]>(queryKeys.scheduler.tasks(), (old) => {
                return old ? old.map((t) => (t._id === data._id ? data : t)) : [];
            });

            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.dashboard() });
        },
    });

    const deleteTaskMutation = useMutation<string, ApiError, string>({
        mutationFn: async (id: string) => {
            await schedulerAxios.delete(`/group/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.setQueryData<ScheduleTask[]>(queryKeys.scheduler.tasks(), (old) => {
                return old ? old.filter((t) => t._id !== id) : [];
            });

            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.dashboard() });
            closeDeleteModal();
        },
    });

    const openDeleteModal = (id: string) => {
        setTaskToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setTaskToDeleteId(null);
        setIsDeleteModalOpen(false);
    };

    const confirmDelete = () => {
        if (taskToDeleteId) {
            deleteTaskMutation.mutate(taskToDeleteId);
        }
    };

    return {
        updateTaskMutation,
        runTaskMutation,
        deleteTaskMutation,
        isDeleteModalOpen,
        isDeleting: deleteTaskMutation.isPending,
        taskToDeleteId,
        openDeleteModal,
        closeDeleteModal,
        confirmDelete,
    };
};
