import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import type { ReportData } from '../types/types';

export const fetchReportPreview = async (taskId: string): Promise<ReportData> => {
    const res = await schedulerAxios.get(`/report/preview/${taskId}`);
    return res.data;
};
