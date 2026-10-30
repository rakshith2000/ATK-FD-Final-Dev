import type { AxiosError } from 'axios';

const NETWORK_CODE_MESSAGES: Record<string, string> = {
    ECONNABORTED: 'Request timed out',
    ETIMEDOUT: 'Connection timed out',
    ENOTFOUND: 'Host not found',
    EAI_AGAIN: 'DNS lookup failed',
    ECONNREFUSED: 'Connection refused by server',
    ERR_CONNECTION_REFUSED: 'Connection refused by server',
    ECONNRESET: 'Connection was reset',
    EHOSTUNREACH: 'Host unreachable',
    ENETUNREACH: 'Network unreachable',
    ERR_NAME_NOT_RESOLVED: 'Host not found (DNS resolution failed)',
};

function getAxiosErrorCode(error: AxiosError): string | undefined {
    if (typeof error.code === 'string') return error.code;

    const cause = (error as unknown as { cause?: { code?: unknown } })?.cause;
    if (cause && typeof cause.code === 'string') return cause.code;

    return undefined;
}

function refineNetworkErrorMessage(error: AxiosError): string {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'You appear to be offline. Please check your internet connection.';
    }

    const code = getAxiosErrorCode(error)?.toUpperCase();
    if (code && NETWORK_CODE_MESSAGES[code]) return NETWORK_CODE_MESSAGES[code];
    if (code === 'ERR_NETWORK') return error.message !== 'Network Error' ? error.message : 'Network error';

    return error.message || 'Network request failed';
}

export default refineNetworkErrorMessage;
