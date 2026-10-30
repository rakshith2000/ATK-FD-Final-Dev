import { useMutation, useQueryClient } from '@tanstack/react-query';
import fasteaiAxios from '@/api/axios-clients/fasteai/fasteai-api-client';
import { SOP_QUERY_KEYS } from '../constants/query-keys';
import type { SOP } from '../types/sop';

type VectorMapping = {
    id: string | number;
    sop_name: string;
};

export const useDeleteSOPMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sop: SOP) => {
            try {
                const vectorResponse = await fasteaiAxios.get<VectorMapping[]>('/sops/vector');

                if (Array.isArray(vectorResponse.data)) {
                    const matchedVector = vectorResponse.data.find((v: VectorMapping) => v.sop_name === sop.sop_name);

                    if (matchedVector?.id) {
                        void `Purging matching vector embedding map index ID: ${matchedVector.id}`;
                        await fasteaiAxios.delete(`/sops/vector/${matchedVector.id}`);
                    }
                }
            } catch (vectorError) {
                void `Vector map lookup or deletion bypass notice: ${String(vectorError)}`;
            }

            void `Executing deletion request sequence on target entity ID: ${sop.id}`;
            await fasteaiAxios.delete(`/sops/${sop.id}`);
        },

        onMutate: async (deletedSop: SOP) => {
            await queryClient.cancelQueries({ queryKey: SOP_QUERY_KEYS.UNIFIED_DATASET });

            const previousSops = queryClient.getQueryData<SOP[]>(SOP_QUERY_KEYS.UNIFIED_DATASET);

            queryClient.setQueryData<SOP[]>(SOP_QUERY_KEYS.UNIFIED_DATASET, (old = []) => old.filter((item) => item.id !== deletedSop.id));

            return { previousSops };
        },

        onError: (_err, _deletedSop, context) => {
            if (context?.previousSops) {
                queryClient.setQueryData(SOP_QUERY_KEYS.UNIFIED_DATASET, context.previousSops);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEYS.UNIFIED_DATASET });
        },
    });
};
