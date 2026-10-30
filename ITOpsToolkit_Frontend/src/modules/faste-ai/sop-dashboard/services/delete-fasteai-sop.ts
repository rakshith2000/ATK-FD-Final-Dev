import { fasteaiFetch, FASTEAI_SOP_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';

export const deleteFastEAISOP = async (id: number): Promise<void> => {
    const res = await fasteaiFetch(`${FASTEAI_SOP_BASE}/sops/${id}`, FASTEAI_SOP_BASE, {
        method: 'delete',
    });

    if (res.status < 200 || res.status >= 300) {
        throw new Error(`Failed to execute relational deletion sequence on target entity ID: ${id}`);
    }
};
