import { ateFetch, FASTEAI_CORE_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import type { LogMessage } from '../types/types';

export const fetchTaskLogs = async (tid: string): Promise<LogMessage[]> => {
    const res = await ateFetch(`${FASTEAI_CORE_BASE}/current-tasks/${tid}/logs`, FASTEAI_CORE_BASE);
    const data = res.data;
    return data?.logs || [];
};
