import { describe, expect, test } from 'vitest';
import { stringifyAnything } from '../stringify-anything';

describe('stringifyAnything', () => {
    test('stringifies primitives', () => {
        expect(stringifyAnything('hello')).toBe('"hello"');
        expect(stringifyAnything(42)).toBe('42');
        expect(stringifyAnything(true)).toBe('true');
        expect(stringifyAnything(null)).toBe('null');
    });

    test('stringifies objects with indentation', () => {
        const result = stringifyAnything({ a: 1, b: 2 });
        expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    test('stringifies arrays with indentation', () => {
        const result = stringifyAnything([1, 'two', 3]);
        expect(result).toBe('[\n  1,\n  "two",\n  3\n]');
    });

    test('stringifies nested objects', () => {
        const result = stringifyAnything({ a: { b: { c: 1 } } });
        expect(JSON.parse(result)).toEqual({ a: { b: { c: 1 } } });
    });

    test('converts functions before stringifying', () => {
        function myFunc() {}
        const result = stringifyAnything({ fn: myFunc });
        expect(result).toContain('[Function: myFunc]');
    });

    test('converts symbols before stringifying', () => {
        const result = stringifyAnything({ s: Symbol('test') });
        expect(result).toContain('Symbol(test)');
    });

    test('handles Error objects', () => {
        const error = new Error('test error', {
            cause: {
                networkCode: 200,
                apiErrorResponse: {
                    output: {
                        error: {
                            message: 'This is a test error message !',
                        },
                        error_message: 'This is second error message',
                    },
                },
            },
        });
        const result = stringifyAnything(error);
        const parsed = JSON.parse(result);
        expect(parsed.message).toBe('test error');
        expect(parsed.stack).toBeDefined();
    });

    test('handles circular references gracefully', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        const result = stringifyAnything(obj);
        expect(result).toContain('[Circular]');
        expect(() => JSON.parse(result)).not.toThrow();
    });

    test('falls back to String() if JSON.stringify throws', () => {
        const evil = {
            toJSON() {
                throw new Error('boom');
            },
        };
        const result = stringifyAnything(evil);
        expect(typeof result).toBe('string');
    });

    test('returns undefined for undefined input', () => {
        expect(stringifyAnything(undefined)).toBeUndefined();
    });
});
