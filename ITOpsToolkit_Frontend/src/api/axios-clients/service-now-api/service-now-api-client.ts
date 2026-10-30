import { appConfig } from '@/config/app-config';
import axios from 'axios';
import { refreshAuthTokenInterceptor } from './refresh-auth-token.interceptor';
import requestInterceptorInsertAuthToken from './apply-auth-token.interceptor';

const serviceNowApiClient = axios.create({
    withCredentials: false,
    timeout: 1000 * 60 * 2, // 2 minutes timeout fo all requests
    timeoutErrorMessage: 'Request time out. Please try again later !',
});

// Set baseURL lazily so appConfig can be loaded at runtime
serviceNowApiClient.interceptors.request.use((config) => {
    config.baseURL = appConfig.serviceNow.api.baseUrl;
    return config;
});

serviceNowApiClient.interceptors.request.use(requestInterceptorInsertAuthToken);
serviceNowApiClient.interceptors.response.use(
    (response) => response,
    (error) => refreshAuthTokenInterceptor(error),
);

export default serviceNowApiClient;
