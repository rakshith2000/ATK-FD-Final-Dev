import { useQuery } from '@tanstack/react-query';
import type { GetModuleConfigsRequest, GetModuleConfigsResponse } from '../types/prompt-library';
import getModuleConfigs from '../services/get-module-configs';

export const useGetModuleConfigsQuery = ({ payload, enabled }: { payload: GetModuleConfigsRequest; enabled: boolean }) => {
    const queryKey = ['get-module-configs', JSON.stringify(payload)];
    const query = useQuery<GetModuleConfigsResponse, Error>({
        queryKey: [...queryKey],
        queryFn: getModuleConfigs.bind(null, { payload }),
        retry: false,
        staleTime: 5 * 60 * 1000,
        enabled,
    });

    return { ...query, queryKey };
};
