import { useQuery } from '@tanstack/react-query';
import type { GetITSMConnectorConfigRequest, ITSMConnectorConfig } from '../types/itsm-connectors';
import getITSMConnectorConfig from '../services/get-itsm-connector-config';

export const useITSMConnectorConfigQuery = ({ enabled, payload }: { payload: GetITSMConnectorConfigRequest; enabled: boolean }) => {
    const queryKey = ['get-itsm-connector-config', JSON.stringify(payload)];
    const query = useQuery<ITSMConnectorConfig, Error>({
        queryKey: [...queryKey],
        queryFn: getITSMConnectorConfig.bind(null, { payload }),
        retry: false,
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    return { ...query, queryKey };
};
