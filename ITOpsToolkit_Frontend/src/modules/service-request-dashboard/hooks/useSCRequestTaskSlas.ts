import { useTaskSlas } from '@/shared/modules/dashboard/hooks/useTaskSlas';
import { fetchTaskSlas } from '@/shared/modules/dashboard/services/task-sla.service';
export const useSCRequestTaskSlas = (
    taskClassName: string,
    filters?: {
        states?: string[];
        priorities?: number[];
        assignment_groups?: string[];
        assigned_to?: string;
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
        queryKeyPrefix: 'screquest-task-slas',

        fetchTaskSlas: (taskClassName, filters) =>
            fetchTaskSlas(
                taskClassName,
                'request_state', // SC Request uses request_state
                filters,
            ),
    });
};
