import { appConfig } from '@/config/app-config';
import axios from 'axios';
import { refreshAuthTokenInterceptor } from './refresh-auth-token.interceptor';
import requestInterceptorInsertAuthToken from './apply-auth-token.interceptor';
import { getSnowApiMode, rewriteToBackendProxy } from './to-backend-proxy-request';

const serviceNowApiClient = axios.create({
    withCredentials: false,
    timeout: 1000 * 60 * 2, // 2 minutes timeout fo all requests
    timeoutErrorMessage: 'Request time out. Please try again later !',
});

// Set baseURL lazily so appConfig can be loaded at runtime.
//
// In `proxy` mode (the default) the request is rewritten to the ATK backend's
// ServiceNow proxy, which authenticates downstream with the ITSM connector's own
// credentials. Call sites keep using ServiceNow-shaped URLs - the rewrite happens
// here, so none of them need to know which mode is active.
serviceNowApiClient.interceptors.request.use((config) => {
    if (getSnowApiMode() === 'direct') {
        config.baseURL = appConfig.serviceNow.api.baseUrl;
        return config;
    }

    const rewritten = rewriteToBackendProxy(config);

    // A URL the proxy has no route for stays pointed at ServiceNow rather than
    // being sent to a backend endpoint that could only 404.
    config.baseURL = rewritten ? appConfig.backend.api.baseUrl : appConfig.serviceNow.api.baseUrl;

    return config;
});

serviceNowApiClient.interceptors.request.use(requestInterceptorInsertAuthToken);
serviceNowApiClient.interceptors.response.use(
    (response) => response,
    (error) => refreshAuthTokenInterceptor(error),
);

export default serviceNowApiClient;
