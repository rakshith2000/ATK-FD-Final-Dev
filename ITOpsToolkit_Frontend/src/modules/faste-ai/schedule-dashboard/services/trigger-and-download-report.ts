import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import type { ScheduleTask } from '../types/types';

export const triggerAndDownloadReport = async (item: ScheduleTask, ciIndex?: number, format?: string): Promise<boolean> => {
    const queryParams: Record<string, string | number> = {};
    if (typeof ciIndex === 'number') queryParams.ci_index = ciIndex;
    if (format) queryParams.format = format;
    const params = Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined;
    const genRes = await schedulerAxios.post<{ success?: boolean; filename?: string }>(`/report/generate/${item._id}`, undefined, params);

    if (genRes.data?.success && genRes.data?.filename) {
        const downloadUrl = `${schedulerAxios.defaults.baseURL}/report/download/${genRes.data.filename}`;
        const fileRes = await fetch(downloadUrl);
        if (fileRes.ok) {
            const blob = await fileRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = genRes.data.filename;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        }
    }
    return false;
};
