const stringifyObjectValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    if (Array.isArray(value)) {
        return value.map(stringifyObjectValue).join(' ');
    }

    if (typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, val]) => `${key} ${stringifyObjectValue(val)}`)
            .join(' ');
    }

    return String(value);
};

export default stringifyObjectValue;
