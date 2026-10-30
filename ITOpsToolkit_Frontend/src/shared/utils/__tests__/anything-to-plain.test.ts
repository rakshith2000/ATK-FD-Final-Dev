import { describe, expect, test } from 'vitest';
import anyToPlainValue from '../anything-to-plain';

describe('anyToPlainValue', () => {
    test('returns null and undefined as-is', () => {
        expect(anyToPlainValue(null)).toBeNull();
        expect(anyToPlainValue(undefined)).toBeUndefined();
    });

    test('returns primitives as-is', () => {
        expect(anyToPlainValue('hello')).toBe('hello');
        expect(anyToPlainValue('')).toBe('');
        expect(anyToPlainValue(42)).toBe(42);
        expect(anyToPlainValue(0)).toBe(0);
        expect(anyToPlainValue(true)).toBe(true);
        expect(anyToPlainValue(false)).toBe(false);
    });

    test('converts functions to descriptive string', () => {
        function myFunc() {}
        expect(anyToPlainValue(myFunc)).toBe('[Function: myFunc]');
        expect(anyToPlainValue(() => {})).toBe('[Function: anonymous]');
    });

    test('converts symbols to string', () => {
        expect(anyToPlainValue(Symbol('test'))).toBe('Symbol(test)');
        expect(anyToPlainValue(Symbol())).toBe('Symbol()');
    });

    test('converts bigint to string with n suffix', () => {
        expect(anyToPlainValue(BigInt(123))).toBe('123n');
        expect(anyToPlainValue(BigInt(0))).toBe('0n');
    });

    test('converts plain objects recursively', () => {
        const input = { a: 1, b: { c: 'hello' } };
        expect(anyToPlainValue(input)).toEqual({ a: 1, b: { c: 'hello' } });
    });

    test('converts arrays recursively', () => {
        const input = [1, 'two', { three: 3 }];
        expect(anyToPlainValue(input)).toEqual([1, 'two', { three: 3 }]);
    });

    test('converts Error instances to plain objects', () => {
        const error = new Error('something broke');
        const result = anyToPlainValue(error) as Record<string, unknown>;
        expect(result.message).toBe('something broke');
        expect(typeof result.stack).toBe('string');
    });

    test('converts nested Error with cause', () => {
        const cause = new Error('root cause');
        const error = new Error('wrapper', { cause });
        const result = anyToPlainValue(error) as Record<string, unknown>;
        expect(result.message).toBe('wrapper');
        const plainCause = result.cause as Record<string, unknown>;
        expect(plainCause.message).toBe('root cause');
    });

    test('handles mixed nested structures', () => {
        const input = {
            list: [1, { nested: true }],
            fn: () => {},
            sym: Symbol('s'),
            nil: null,
        };
        const result = anyToPlainValue(input) as Record<string, unknown>;
        expect(result.list).toEqual([1, { nested: true }]);
        expect(result.fn).toBe('[Function: fn]');
        expect(result.sym).toBe('Symbol(s)');
        expect(result.nil).toBeNull();
    });

    test('returns [Circular] for circular object references', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        const result = anyToPlainValue(obj) as Record<string, unknown>;
        expect(result.a).toBe(1);
        expect(result.self).toBe('[Circular]');
    });

    test('returns [Circular] for circular array references', () => {
        const arr: unknown[] = [1, 2];
        arr.push(arr);
        const result = anyToPlainValue(arr) as unknown[];
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe('[Circular]');
    });

    test('returns [Max depth reached] beyond depth 20', () => {
        let obj: Record<string, unknown> = { value: 'deep' };
        for (let i = 0; i < 22; i++) {
            obj = { child: obj };
        }
        const result = JSON.stringify(anyToPlainValue(obj));
        expect(result).toContain('[Max depth reached]');
    });

    test('does not flag shared references as circular', () => {
        const shared = { id: 42, name: 'shared' };
        const obj = { a: shared, b: shared };
        const result = anyToPlainValue(obj) as Record<string, unknown>;
        expect(result.a).toEqual({ id: 42, name: 'shared' });
        expect(result.b).toEqual({ id: 42, name: 'shared' });
    });

    test('handles axios-style cause with shared data ref', () => {
        const data = { message: 'Bad request', detail: 'field missing' };
        const cause = {
            networkCode: 400,
            originalError: { response: { data } },
            apiErrorResponse: data,
        };
        const result = anyToPlainValue(cause) as Record<string, unknown>;
        const apiResponse = result.apiErrorResponse as Record<string, unknown>;
        expect(apiResponse.message).toBe('Bad request');
        expect(apiResponse.detail).toBe('field missing');
    });

    test('preserves data up to depth 20', () => {
        let obj: Record<string, unknown> = { value: 'leaf' };
        for (let i = 0; i < 19; i++) {
            obj = { child: obj };
        }
        const result = JSON.stringify(anyToPlainValue(obj));
        expect(result).toContain('leaf');
        expect(result).not.toContain('[Max depth reached]');
    });
});
