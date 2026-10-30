import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

function makeAxiosResponse<T = unknown>(
    data: T,
    status = 200,
    statusText = 'OK',
    headers: Record<string, string> = {},
    config: Partial<InternalAxiosRequestConfig> = {},
): AxiosResponse<T> {
    return {
        data,
        status,
        statusText,
        headers,
        config: { headers: {}, ...config } as InternalAxiosRequestConfig,
    };
}

export default makeAxiosResponse;
