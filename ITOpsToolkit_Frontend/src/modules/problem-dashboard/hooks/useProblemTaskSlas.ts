import { useTaskSlas } from '@/shared/modules/dashboard/hooks/useTaskSlas';
import { fetchTaskSlas } from '@/shared/modules/dashboard/services/task-sla.service';

export const useProblemTaskSlas = (
    taskClassName: string,
    filters?: {
        states?: number[];
        priorities?: number[];
        assignment_groups?: string[];
        assigned_to?: string;
        categories?: string[];
        dateRange?: { start: string; end: string };
    },
    context?: 'me' | 'org',
    enabled = true,
) => {
    return useTaskSlas({
        taskClassName,
        filters,
        context,
        enabled,
        queryKeyPrefix: 'problem-task-slas',

        fetchTaskSlas: (taskClassName, filters) =>
            fetchTaskSlas(
                taskClassName,
                'state', // Problem also uses state
                filters,
            ),
    });
};
