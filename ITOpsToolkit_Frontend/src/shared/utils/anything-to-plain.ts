function anyToPlainValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
    if (depth > 20) return '[Max depth reached]';
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'bigint') return `${value}n`;

    const obj = value as object;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    let result: unknown;

    if (value instanceof Error) {
        const plain: Record<string, unknown> = {};
        for (const key of Object.getOwnPropertyNames(value)) {
            plain[key] = anyToPlainValue((value as unknown as Record<string, unknown>)[key], depth + 1, seen);
        }
        result = plain;
    } else if (Array.isArray(value)) {
        result = value.map((item) => anyToPlainValue(item, depth + 1, seen));
    } else if (typeof value === 'object') {
        const plain: Record<string, unknown> = {};
        for (const key of Object.getOwnPropertyNames(value)) {
            plain[key] = anyToPlainValue((value as Record<string, unknown>)[key], depth + 1, seen);
        }
        result = plain;
    } else {
        result = String(value);
    }

    seen.delete(obj);
    return result;
}

export default anyToPlainValue;
