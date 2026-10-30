import type { IncidentStatsGroupByField } from '../types/snow-stats';

export function isIncidentStatsGroupByField(item: unknown): item is IncidentStatsGroupByField {
    if (typeof item !== 'object' || item === null) return false;

    const s = item as Record<string, unknown>;

    // Validate the stats object and groupby_fields array
    const hasStats = typeof s.stats === 'object' && s.stats !== null && typeof (s.stats as Record<string, unknown>).count === 'string';

    const hasGroupby = Array.isArray(s.groupby_fields) && s.groupby_fields.length > 0 && typeof (s.groupby_fields[0] as Record<string, unknown>)?.display_value === 'string';

    return hasStats && hasGroupby;
}

export function isIncidentStatsGroupByFieldArray(data: unknown): data is IncidentStatsGroupByField[] {
    // 1. Ensure data is an array
    if (!Array.isArray(data)) {
        return false;
    }

    // 2. Validate every item in the array
    return data.every(isIncidentStatsGroupByField);
}
