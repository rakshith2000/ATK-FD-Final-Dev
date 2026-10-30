type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
    const result = { ...target };

    for (const key in source) {
        const sourceVal = source[key];
        const targetVal = target[key];

        if (sourceVal === undefined) continue;

        if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
            result[key] = [...targetVal, ...sourceVal] as T[typeof key];
            continue;
        }

        if (typeof sourceVal === 'object' && sourceVal !== null && !Array.isArray(sourceVal) && typeof targetVal === 'object' && targetVal !== null && !Array.isArray(targetVal)) {
            result[key] = deepMerge(targetVal, sourceVal as DeepPartial<typeof targetVal>);
            continue;
        }

        result[key] = sourceVal as T[typeof key];
    }

    return result;
}

export default deepMerge;
