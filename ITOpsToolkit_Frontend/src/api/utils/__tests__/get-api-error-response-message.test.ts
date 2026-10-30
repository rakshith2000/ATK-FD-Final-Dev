import { describe, expect, test } from 'vitest';
import { getApiErrorMessage } from '../api-axios-error-response-message';

describe('getAPiErrorMessage', () => {
    test('returns null for null, undefined, and non-objects', () => {
        expect(getApiErrorMessage(null)).toBeNull();
        expect(getApiErrorMessage(undefined)).toBeNull();
        expect(getApiErrorMessage('string')).toBeNull();
        expect(getApiErrorMessage(42)).toBeNull();
    });

    test('returns null for empty object', () => {
        expect(getApiErrorMessage({})).toBeNull();
    });

    test('returns null for empty string values', () => {
        expect(getApiErrorMessage({ message: '' })).toBeNull();
        expect(getApiErrorMessage({ error: '' })).toBeNull();
        expect(getApiErrorMessage({ detail: '' })).toBeNull();
    });

    // { message: "..." }
    test('extracts top-level message', () => {
        expect(getApiErrorMessage({ message: 'Bad request' })).toBe('Bad request');
    });

    // { error: { message: "..." } }
    test('extracts nested error.message', () => {
        expect(getApiErrorMessage({ error: { message: 'Unauthorized' } })).toBe('Unauthorized');
    });

    // { error: "..." } - ServiceNow table API
    test('extracts error string', () => {
        expect(getApiErrorMessage({ error: 'Record not found' })).toBe('Record not found');
    });

    // { detail: "..." } - FastAPI HTTP exception
    test('extracts FastAPI detail string', () => {
        expect(getApiErrorMessage({ detail: 'Invalid token' })).toBe('Invalid token');
    });

    // { detail: [{ msg: "..." }] } - FastAPI validation errors
    test('formats FastAPI validation error array', () => {
        const data = {
            detail: [
                { msg: 'field required', type: 'value_error.missing', loc: ['body', 'name'] },
                { msg: 'not a valid integer', type: 'type_error.integer', loc: ['body', 'age'] },
            ],
        };
        expect(getApiErrorMessage(data)).toBe("'name': field required; 'age': not a valid integer");
    });

    test('handles validation array with non-object entries', () => {
        expect(getApiErrorMessage({ detail: ['just a string'] })).toBeNull();
    });

    // { error_description: "..." } - OAuth
    test('extracts OAuth error_description', () => {
        expect(getApiErrorMessage({ error_description: 'The access token expired' })).toBe('The access token expired');
    });

    // { result: { error: { message: "..." } } } - ServiceNow scripted REST
    test('extracts ServiceNow result.error.message', () => {
        const data = { result: { error: { message: 'Insufficient rights' } } };
        expect(getApiErrorMessage(data)).toBe('Insufficient rights');
    });

    // { error: { detail: "..." } } - FastAPI behind gateway
    test('extracts error.detail', () => {
        expect(getApiErrorMessage({ error: { detail: 'Upstream timeout' } })).toBe('Upstream timeout');
    });

    test('prioritizes detail over other fields', () => {
        const data = {
            message: 'Primary message',
            detail: 'Should not be returned',
            error: 'Also should not be returned',
        };
        expect(getApiErrorMessage(data)).toBe('Should not be returned');
    });

    test('falls through to detail when message is missing', () => {
        const data = { detail: 'Fallback detail', error_description: 'Should not reach' };
        expect(getApiErrorMessage(data)).toBe('Fallback detail');
    });
});
