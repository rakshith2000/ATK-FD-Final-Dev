import { useQuery } from '@tanstack/react-query';
import type { GetToolkitPackageConfigRequest, GetToolkitPackageConfigResponse } from '../types/prompt-library';
import getToolkitPackageConfig from '../services/get-toolkit-package-config';

export const useGetToolkitPackageConfigQuery = ({ payload, enabled }: { payload: GetToolkitPackageConfigRequest; enabled: boolean }) => {
    const queryKey = ['get-toolkit-package-config', JSON.stringify(payload)];
    const query = useQuery<GetToolkitPackageConfigResponse, Error>({
        queryKey: [...queryKey],
        queryFn: getToolkitPackageConfig.bind(null, { payload }),
        retry: false,
        staleTime: 5 * 60 * 1000,
        enabled,
    });

    return { ...query, queryKey };
};
