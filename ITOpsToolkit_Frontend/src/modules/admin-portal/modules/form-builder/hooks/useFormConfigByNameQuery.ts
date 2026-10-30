import { useQuery } from '@tanstack/react-query';
import getFormConfigurationService from '../services/get-form-configuration.service';

export const FORM_CONFIG_BY_NAME_QUERY_KEY = 'form-config-by-name' as const;

export function useFormConfigByNameQuery(name: string) {
    const queryKey = [FORM_CONFIG_BY_NAME_QUERY_KEY, name];
    const query = useQuery({
        queryKey: [...queryKey],
        queryFn: () => getFormConfigurationService({ form_name: name }),
        enabled: !!name,
        retry: false,
    });

    return { ...query, queryKey };
}
