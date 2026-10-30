// import logger from '@/shared/utils/logger';
import axios, { type AxiosError, type AxiosResponse } from 'axios';
import refineNetworkErrorMessage from './refine-network-error-message';
import unknownErrorToMessage from '@/shared/utils/unknown-error-to-message';
import { getApiErrorMessage } from './api-axios-error-response-message';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';

export async function withApiResponseHandler<T>(apiCallFn: () => Promise<T>): Promise<T> {
    try {
        const response = await apiCallFn();
        return response;
    } catch (error) {
        // logger.debug('API Error caught in withAPIResponseHandler', error, (error as Error)?.cause);

        // Silently ignore axios canceled requests (AbortController)
        if (axios.isCancel(error)) {
            throw error;
        }

        const mayBeAxiosError = (error as AxiosError) || undefined;

        if (mayBeAxiosError?.isAxiosError) {
            // No response - network-level failure (offline, DNS, refused, CORS, etc.)
            if (!mayBeAxiosError?.response) {
                const code = mayBeAxiosError.code?.toUpperCase();
                const networkErrorMessage = refineNetworkErrorMessage(mayBeAxiosError);

                throw new Error(networkErrorMessage, {
                    cause: {
                        networkCode: code,
                        originalError: error,
                        isNetworkError: true,
                    },
                });
            }

            const response: AxiosResponse = mayBeAxiosError.response;
            const status = response.status;
            const data: unknown = response.data;

            // logger.debug('data,', data);

            if (status === 401) {
                const authMessage = getApiErrorMessage(data);
                if (authMessage) {
                    globalAlertDialogEventBus.emit('show-dialog', {
                        title: 'Authentication Error !',
                        note: authMessage,
                        severity: 'error',
                        priority: 'high',
                        actions: [
                            {
                                label: 'Re-Authenticate !',
                                onClick: () => getAuthProviderInstance().login(),
                                variant: 'info',
                            },
                            {
                                label: 'Logout !',
                                onClick: () => getAuthProviderInstance().logout(),
                                variant: 'error',
                            },
                        ],
                    });

                    throw new Error('Session Expired, Intercative Login required !', {
                        cause: {
                            networkCode: status,
                            originalError: error,
                            apiErrorResponse: data,
                        },
                    });
                }
            }

            // API returned a structured error message
            const apiMessage = getApiErrorMessage(data);
            if (apiMessage) {
                throw new Error(apiMessage, {
                    cause: {
                        networkCode: status,
                        originalError: error,
                        apiErrorResponse: data,
                    },
                });
            }

            // Gateway / proxy errors
            if (status === 502 || status === 503 || status === 504) {
                throw new Error(`Gateway error occurred (status ${status}). Please try again later.`, {
                    cause: {
                        networkCode: status,
                        originalError: error,
                    },
                });
            }

            // Generic server error
            if (status >= 500) {
                throw new Error(`Server error occurred (status ${status}). Please try again later.`, {
                    cause: {
                        networkCode: status,
                        originalError: error,
                    },
                });
            }

            // All other HTTP errors (4xx etc)
            const httpMessage = mayBeAxiosError.message || response.statusText || `HTTP ${status} error occurred`;
            throw new Error(httpMessage, {
                cause: {
                    networkCode: status ?? response.statusText,
                    originalError: error,
                },
            });
        }

        // Network TypeError that bypassed Axios (e.g. preflight failure, DNS, offline)
        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed to fetch'))) {
            throw new Error('A network error occurred. Please check your connection or try again.', {
                cause: {
                    networkCode: 'ERR_NETWORK',
                    originalError: error,
                    isNetworkError: true,
                },
            });
        }

        // Navigator offline
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOffline) {
            throw new Error('You appear to be offline. Please check your internet connection!', {
                cause: {
                    originalError: error,
                    isNetworkError: true,
                },
            });
        }

        // Aborted request
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('API call was aborted', {
                cause: {
                    originalError: error,
                },
            });
        }

        // Fallback
        const genericErrorMessage = unknownErrorToMessage(error);
        // logger.debug('Non-Axios error caught in withApiResponseHandler:', error, (error as Error)?.cause);

        throw new Error(genericErrorMessage, {
            cause: {
                originalError: error,
            },
        });
    }
}
