export function isStringArrayMap(value: unknown): value is Record<string, string[]> {
    return (
        value !== null && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every((v) => Array.isArray(v) && v.every((item) => typeof item === 'string'))
    );
}
