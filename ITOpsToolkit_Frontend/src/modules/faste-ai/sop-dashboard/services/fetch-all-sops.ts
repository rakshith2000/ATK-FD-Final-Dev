import { fasteaiFetch, FASTEAI_SOP_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import type { SOP } from '../types/sop';

export const fetchAllSOPs = async (): Promise<SOP[]> => {
    const res = await fasteaiFetch(`${FASTEAI_SOP_BASE}/sops`, FASTEAI_SOP_BASE);

    if (res.status < 200 || res.status >= 300) {
        throw new Error('Failed to fetch structural SOP datasets');
    }

    const data = res.data;
    return Array.isArray(data) ? data : [];
};
