import { useQuery } from '@tanstack/react-query';
import { fetchAllSOPs } from '../services/fetch-all-sops';
import { SOP_QUERY_KEYS } from '../constants/query-keys';
import type { SOP } from '../types/sop';

export const useSOPQueries = () => {
    const sopsQuery = useQuery<SOP[]>({
        queryKey: SOP_QUERY_KEYS.UNIFIED_DATASET,
        queryFn: fetchAllSOPs,
        staleTime: 30 * 1000,
    });

    const rawData = sopsQuery.data ?? [];

    const isApprovedTrue = (sop: SOP): boolean => {
        return String(sop.is_approved).toLowerCase().trim() === 'true';
    };

    const approvedSops = rawData.filter((sop) => isApprovedTrue(sop));
    const aiPendingSops = rawData.filter((sop) => !isApprovedTrue(sop) && sop.created_by === 'AI');
    const allAwaitingApprovalSops = rawData.filter((sop) => !isApprovedTrue(sop));

    return {
        sopsQuery,
        sops: approvedSops,
        aiPendingSops,
        allAwaitingApprovalSops,
    };
};
