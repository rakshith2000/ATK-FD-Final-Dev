import { useQuery } from '@tanstack/react-query';
import type { ITSMConnectorsListResponse } from '../types/itsm-connectors';
import fetchITSMConnectors from '../services/fetch-itsm-connectors';

export const useITSMConnectorsListQuery = () => {
    const queryKey = ['itsm-connectors-list'] as const;

    const query = useQuery<ITSMConnectorsListResponse, Error>({
        queryKey,
        queryFn: fetchITSMConnectors,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
};
