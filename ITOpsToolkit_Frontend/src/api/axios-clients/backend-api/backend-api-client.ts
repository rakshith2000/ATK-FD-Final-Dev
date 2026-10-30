import { appConfig } from '@/config/app-config';
import axios from 'axios';
import requestInterceptorInsertAuthToken from './apply-auth-token.interceptor';
import { refreshAuthTokenInterceptor } from './refresh-auth-token.interceptor';

const backendApiClient = axios.create({
    withCredentials: false,
    timeout: 1000 * 60 * 2, // 2 minutes timeout fo all requests
    timeoutErrorMessage: 'Request time out. Please try again later !',
});

backendApiClient.interceptors.request.use((config) => {
    config.baseURL = appConfig.backend.api.baseUrl;
    return config;
});

backendApiClient.interceptors.request.use(requestInterceptorInsertAuthToken);
backendApiClient.interceptors.response.use(
    (response) => response,
    (error) => refreshAuthTokenInterceptor(error),
);
export default backendApiClient;
