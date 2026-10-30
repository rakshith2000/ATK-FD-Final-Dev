export function getValueAtPath(obj: unknown, path: string): unknown {
    if (!path) return obj;
    return path.split('.').reduce<unknown>((acc, key) => {
        if (isPlainObject(acc)) return (acc as Record<string, unknown>)[key];
        if (Array.isArray(acc)) return acc[Number(key)];
        return undefined;
    }, obj);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPrimitive(value: unknown): value is Primitive {
    return value == null || (typeof value !== 'object' && typeof value !== 'function');
}

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type ChangedField = {
    path: string;
    value: unknown;
};

export function getChangedFields(current: unknown, initial: unknown, basePath = ''): Array<ChangedField> {
    if (Object.is(current, initial)) return [];
    if (isPrimitive(current) || isPrimitive(initial)) {
        return basePath ? [{ path: basePath, value: current }] : [];
    }
    if (Array.isArray(current) || Array.isArray(initial)) {
        const currentArray = Array.isArray(current) ? current : [];
        const initialArray = Array.isArray(initial) ? initial : [];
        const max = Math.max(currentArray.length, initialArray.length);
        const results = [];
        for (let i = 0; i < max; i++) {
            const path = basePath ? `${basePath}.${i}` : String(i);
            results.push(...getChangedFields(currentArray[i], initialArray[i], path));
        }
        return results;
    }
    if (isPlainObject(current) || isPlainObject(initial)) {
        const curr = isPlainObject(current) ? current : {};
        const init = isPlainObject(initial) ? initial : {};
        const keys = new Set([...Object.keys(curr), ...Object.keys(init)]);
        const results = [];
        for (const key of keys) {
            const path = basePath ? `${basePath}.${key}` : key;
            results.push(...getChangedFields(curr[key], init[key], path));
        }
        return results;
    }
    return basePath ? [{ path: basePath, value: current }] : [];
}
