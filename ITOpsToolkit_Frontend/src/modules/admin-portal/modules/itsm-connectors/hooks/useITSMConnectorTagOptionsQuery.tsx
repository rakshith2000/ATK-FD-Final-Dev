import { useQuery } from '@tanstack/react-query';
import type { ITSMConnectorsListResponse } from '../types/itsm-connectors';
import fetchITSMConnectors from '../services/fetch-itsm-connectors';

type ITSMTagOption = { label: string; value: string };

export const useITSMConnectorTagOptionsQuery = () => {
    const queryKey = ['itsm-connector-tags-options-list'] as const;

    const query = useQuery<ITSMConnectorsListResponse, Error, ITSMTagOption[]>({
        queryKey,
        queryFn: fetchITSMConnectors,
        retry: false,
        staleTime: 5 * 60 * 1000,
        select: (data) => data.map((item) => ({ label: `${item.itsm_tag}`, value: item.itsm_tag })),
    });

    return { ...query, queryKey };
};
