import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import logger from '@/shared/utils/logger';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import serviceNowApiClient from './service-now-api-client';
import { appConfig } from '@/config/app-config';

let isTokenRefreshInProgress = false;

let failedRequestQueue: Array<{
    config: InternalAxiosRequestConfig;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
}> = [];

const getMaxTokenRefreshRetries = () => appConfig.auth.MAX_TOKEN_REFRESH_RETRIES;

function retryFailedRequestQueue(newToken: string) {
    logger.debug('Retrying failed request queue.', failedRequestQueue.length, 'items');
    for (const { config, resolve, reject } of failedRequestQueue) {
        config.headers['Authorization'] = `Bearer ${newToken}`;
        serviceNowApiClient(config).then(resolve).catch(reject);
    }
    failedRequestQueue = [];
}

function rejectFailedRequestQueue(error: unknown) {
    for (const { reject } of failedRequestQueue) {
        reject(error);
    }
    failedRequestQueue = [];
}

export async function refreshAuthTokenInterceptor(error: AxiosError) {
    const authProviderInstance = getAuthProviderInstance();
    const originalRequest = error.config;
    const excludedEndpointsFromRetry: Array<string> = [];

    if (!originalRequest) {
        throw error;
    }

    if (excludedEndpointsFromRetry.some((endpoint) => originalRequest.url?.includes(endpoint))) {
        throw error;
    }

    originalRequest._retryCount = originalRequest._retryCount || 0;

    logger.debug(
        'Response error: ',
        originalRequest?.url,
        error.response?.status,
        'Retry count:',
        originalRequest._retryCount,
        isTokenRefreshInProgress,
        'Response data:',
        error?.response?.data,
    );

    if (error?.response?.status === 401 && originalRequest?._retryCount < getMaxTokenRefreshRetries()) {
        originalRequest._retryCount += 1;

        // If a refresh is already in progress, queue this request to be retried
        // once the refresh completes - don't trigger another refresh
        if (isTokenRefreshInProgress) {
            return new Promise((resolve, reject) => {
                failedRequestQueue.push({ config: originalRequest, resolve, reject });
            });
        }

        isTokenRefreshInProgress = true;
        logger.debug('[snow] Starting token refresh. retryCount:', originalRequest._retryCount);

        return new Promise((resolve, reject) => {
            authProviderInstance
                .refreshToken('serviceNow')
                .then((newToken) => {
                    serviceNowApiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                    // Retry all queued requests through the client (with interceptors)
                    retryFailedRequestQueue(newToken);

                    // Retry the first request that triggered the refresh
                    resolve(serviceNowApiClient(originalRequest));
                })
                .catch((err) => {
                    logger.debug(err);
                    logger.debug('Failed to refresh token. Login required.');

                    rejectFailedRequestQueue(err);
                    reject(err);
                })
                .finally(() => {
                    isTokenRefreshInProgress = false;
                });
        });
    }

    throw error;
}
