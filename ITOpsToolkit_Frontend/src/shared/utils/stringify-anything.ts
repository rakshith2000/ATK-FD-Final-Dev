import anyToPlainValue from './anything-to-plain';

export function stringifyAnything(value: unknown): string {
    try {
        return JSON.stringify(anyToPlainValue(value), null, 2);
    } catch {
        return String(value);
    }
}
