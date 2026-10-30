import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import type { InternalAxiosRequestConfig } from 'axios';

const requestInterceptorInsertAuthToken = async (config: InternalAxiosRequestConfig) => {
    const excludeEndpoints: Array<string> = [];

    if (excludeEndpoints.some((endPoint) => config.url?.includes(endPoint))) {
        return config;
    }

    const authToken = await getAuthProviderInstance().getAccessToken('backend');

    if (authToken && config.headers) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    return config;
};

export default requestInterceptorInsertAuthToken;
