import { fasteaiFetch, FASTEAI_LOGS_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import type { SOP } from '../types/sop';

export const fetchAISOPs = async (): Promise<SOP[]> => {
    const res = await fasteaiFetch(`${FASTEAI_LOGS_BASE}/sops`, FASTEAI_LOGS_BASE);

    if (res.status < 200 || res.status >= 300) {
        throw new Error('Failed to extract AI engine transaction logs');
    }

    const data = res.data;
    return Array.isArray(data) ? data : [];
};
