import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getMimDetails } from '../services/mim-details.service';
import type { GetMimDetailsRequest, MimDataResponse } from '../types';

export interface UseGetMimDetailsParams extends GetMimDetailsRequest {
    enabled?: boolean;
}

export function useGetMimDetails(params: UseGetMimDetailsParams, options?: Omit<UseQueryOptions<MimDataResponse, Error>, 'queryKey' | 'queryFn'>) {
    const { incident_number, enabled = true } = params;
    const queryKey = ['mim-details', incident_number];

    const query = useQuery<MimDataResponse, Error>({
        queryKey: [...queryKey],
        queryFn: () => getMimDetails({ incident_number }),
        enabled: Boolean(enabled && incident_number),
        ...options,
    });

    return {
        ...query,
        queryKey,
    };
}
