import { useMutation, useQueryClient } from '@tanstack/react-query';
import fasteaiAxios from '@/api/axios-clients/fasteai/fasteai-api-client';
import { SOP_QUERY_KEYS } from '../constants/query-keys';
import type { SOP } from '../types/sop';

export const useApproveSOPMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sop: SOP) => {
            const approvedValue = 'True' as const;

            await fasteaiAxios.post(`/sops/vector`, {
                sop_name: sop.sop_name,
                sop_content: sop.sop_content,
                category: sop.category,
                is_approved: approvedValue,
                created_by: sop.created_by ?? 'UI',
            });

            await fasteaiAxios.put(`/sops/${sop.id}`, {
                ...sop,
                is_approved: approvedValue,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEYS.UNIFIED_DATASET });
        },
        onError: (err) => {
            throw new Error(`SOP Approval transaction execution failed: ${String(err)}`);
        },
    });
};
