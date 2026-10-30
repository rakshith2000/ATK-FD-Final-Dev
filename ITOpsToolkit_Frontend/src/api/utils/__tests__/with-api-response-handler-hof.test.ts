import { describe, expect, test } from 'vitest';
import axios from 'axios';
import { withApiResponseHandler } from '../with-api-response-handler-hof';
import makeAxiosError from '../make-axios-error';

function makeNetworkAxiosError(code: string, message: string): InstanceType<typeof axios.AxiosError> {
    return new axios.AxiosError(message, code, undefined, undefined, undefined);
}

type ErrorCause = {
    networkCode?: number | string;
    originalError?: unknown;
    apiErrorResponse?: unknown;
};

describe('withAPIResponseHandler', () => {
    test('returns the response on success', async () => {
        const response = { data: { result: 'ok' } };
        const result = await withApiResponseHandler(() => Promise.resolve(response));
        expect(result).toBe(response);
    });

    // Axios error with response data containing { message }
    test('throws with API message from { message } shape', async () => {
        const axiosErr = makeAxiosError('Request failed', 400, { message: 'Invalid request body' });
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Invalid request body');

        try {
            await withApiResponseHandler(() => Promise.reject(axiosErr));
        } catch (e) {
            const cause = (e as Error).cause as ErrorCause;
            expect(cause.networkCode).toBe(400);
            expect(cause.apiErrorResponse).toEqual({ message: 'Invalid request body' });
        }
    });

    // { error: { message } }
    test('throws with API message from { error: { message } } shape', async () => {
        const axiosErr = makeAxiosError('Request failed', 403, { error: { message: 'Forbidden' } });
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Forbidden');
    });

    // { detail: "..." } - FastAPI
    test('throws with API message from { detail } shape', async () => {
        const axiosErr = makeAxiosError('Request failed', 401, { detail: 'Not authenticated' });
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Session Expired, Intercative Login required !');
    });

    // { detail: [{ msg }] } - FastAPI validation errors
    test('throws with joined validation errors from FastAPI', async () => {
        const data = {
            detail: [
                { msg: 'field required', type: 'value_error.missing', loc: ['body', 'name'] },
                { msg: 'not a valid integer', type: 'type_error.integer', loc: ['body', 'age'] },
            ],
        };
        const axiosErr = makeAxiosError('Request failed', 422, data);
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow("'name': field required; 'age': not a valid integer");
    });

    // { error: "..." } - ServiceNow table API
    test('throws with API message from { error: "string" } shape', async () => {
        const axiosErr = makeAxiosError('Request failed', 404, { error: 'Record not found' });
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Record not found');
    });

    // { result: { error: { message } } } - ServiceNow scripted REST
    test('throws with API message from ServiceNow result.error.message', async () => {
        const data = { result: { error: { message: 'Insufficient rights' } } };
        const axiosErr = makeAxiosError('Request failed', 403, data);
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Insufficient rights');
    });

    // 5xx with no extractable message
    test('throws generic server error for 5xx without message', async () => {
        const axiosErr = makeAxiosError('Request failed', 502, {});
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Gateway error occurred (status 502). Please try again later.');
    });

    test('throws generic server error for 500 without message', async () => {
        const axiosErr = makeAxiosError('Request failed', 500, null);
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Server error occurred (status 500). Please try again later.');
    });

    // Non-5xx with no extractable message falls through to HTTP message
    test('falls through to axios message for non-5xx without API message', async () => {
        const axiosErr = makeAxiosError('Request failed with status code 429', 429, {});
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('Request failed with status code 429');
    });

    test('falls through to statusText when axios message is empty', async () => {
        const axiosErr = makeAxiosError('', 418, {}, "I'm a Teapot");
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow("I'm a Teapot");
    });

    test('falls through to generic HTTP message when both are empty', async () => {
        const axiosErr = makeAxiosError('', 418, {}, '');
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow('HTTP 418 error occurred');
    });

    // Network error (no response at all)
    test('throws refined network error when no response is present', async () => {
        const axiosErr = makeNetworkAxiosError('ECONNABORTED', 'timeout of 5000ms exceeded');
        await expect(withApiResponseHandler(() => Promise.reject(axiosErr))).rejects.toThrow();

        try {
            await withApiResponseHandler(() => Promise.reject(axiosErr));
        } catch (e) {
            const cause = (e as Error).cause as ErrorCause;
            expect(cause.originalError).toBe(axiosErr);
            expect(cause.networkCode).toBe('ECONNABORTED');
        }
    });

    // AbortError
    test('throws abort message for DOMException AbortError', async () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        await expect(withApiResponseHandler(() => Promise.reject(abortError))).rejects.toThrow('API call was aborted');
    });

    // Generic non-axios Error
    test('throws generic message for non-axios errors', async () => {
        const genericError = new Error('Something unexpected');
        await expect(withApiResponseHandler(() => Promise.reject(genericError))).rejects.toThrow('Something unexpected');

        try {
            await withApiResponseHandler(() => Promise.reject(genericError));
        } catch (e) {
            const cause = (e as Error).cause as ErrorCause;
            expect(cause.originalError).toBe(genericError);
        }
    });

    // Non-Error throw (string, number, etc.)
    test('handles non-Error thrown values', async () => {
        await expect(withApiResponseHandler(() => Promise.reject('raw string error'))).rejects.toThrow('raw string error');
    });

    // Cause chain preserves original error
    test('cause always contains originalError', async () => {
        const axiosErr = makeAxiosError('fail', 400, { message: 'Bad' });
        try {
            await withApiResponseHandler(() => Promise.reject(axiosErr));
        } catch (e) {
            const cause = (e as Error).cause as ErrorCause;
            expect(cause.originalError).toBe(axiosErr);
        }
    });
});
