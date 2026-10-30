import type { KVEntry } from '../components/ui/KeyValueEditor/KeyValueEditor';

export const recordToKV = (record?: Record<string, unknown>): KVEntry[] => (record ? Object.entries(record).map(([key, value]) => ({ key, value: String(value) })) : []);

export const kvToRecord = (entries: KVEntry[]): Record<string, string> | undefined => {
    const valid = entries.filter((e) => e.key.trim());
    return valid.length ? Object.fromEntries(valid.map((e) => [e.key.trim(), e.value])) : undefined;
};

export const hasInvalidKVEntries = (entries: KVEntry[]): boolean => entries.some((e) => !e.key.trim() || !e.value.trim());
