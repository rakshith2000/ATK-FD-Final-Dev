type ErrorCause = {
    networkCode?: number | string;
    originalError?: unknown;
    apiErrorResponse?: unknown;
    isNetworkError?: boolean;
};

const HTTP_STATUS_TITLES: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Request Timeout',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
};

function getErrorTitle(error: unknown): string {
    if (!(error instanceof Error)) return 'Error';

    const cause = error.cause as ErrorCause | undefined;

    if (cause?.isNetworkError) return 'Network Error';

    const status = cause?.networkCode;

    if (typeof status === 'number') {
        if (HTTP_STATUS_TITLES[status]) return HTTP_STATUS_TITLES[status];
        if (status >= 500) return 'Server Error';
        if (status >= 400) return 'Client Error';
    }

    // DOMException (e.g. AbortError)
    const original = cause?.originalError;
    if (original instanceof DOMException && original.name === 'AbortError') return 'Request Aborted';

    return 'Something Went Wrong';
}

export default getErrorTitle;
