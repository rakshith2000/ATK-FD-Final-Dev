import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/fetch-dashboard-data';
import { fetchReportPreview } from '../services/fetch-report-preview';

export const useDashboardData = () => {
    return useQuery({
        queryKey: ['scheduleDashboardData'],
        queryFn: fetchDashboardData,
        refetchOnWindowFocus: false,
    });
};

export const useReportPreview = (taskId: string, enabled: boolean) => {
    return useQuery({
        queryKey: ['reportPreview', taskId],
        queryFn: () => fetchReportPreview(taskId),
        enabled: enabled,
        refetchOnWindowFocus: false,
    });
};
