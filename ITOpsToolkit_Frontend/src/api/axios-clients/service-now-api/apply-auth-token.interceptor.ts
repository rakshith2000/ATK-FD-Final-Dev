import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import type { InternalAxiosRequestConfig } from 'axios';
import { getSnowApiMode } from './to-backend-proxy-request';

const requestInterceptorInsertAuthToken = async (config: InternalAxiosRequestConfig) => {
    const excludeEndpoints: Array<string> = [];

    if (excludeEndpoints.some((endPoint) => config.url?.includes(endPoint))) {
        return config;
    }

    let authToken = '';

    if (getSnowApiMode() === 'proxy') {
        // The request goes to the ATK backend, not ServiceNow, so it needs a
        // token minted for the backend. ServiceNow is authenticated separately
        // by the backend using the ITSM connector credentials.
        authToken = await getAuthProviderInstance().getAccessToken('backend');
    } else if (appConfig?.auth?.provider === 'keycloak' && appConfig?.auth?.keycloak?.identityProvider === 'others') {
        authToken = (await getAuthProviderInstance().getkeycloakIdapBrokerAccessToken?.()) ?? '';
    } else {
        authToken = await getAuthProviderInstance().getAccessToken('serviceNow');
    }

    if (authToken && config.headers) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    return config;
};

export default requestInterceptorInsertAuthToken;
