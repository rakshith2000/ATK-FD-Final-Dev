/**
 * Parses a ServiceNow local date-time string into a Date without forcing UTC.
 * Mirrors the parsing approach in `@/shared/utils/format-local-date` (space -> 'T',
 * no trailing 'Z') so durations stay in the user's local timezone.
 */
export const parseLocalDate = (val?: string | null): Date | null => {
    if (!val) return null;
    const localString = val.includes('T') ? val : val.replace(' ', 'T');
    const date = new Date(localString);
    return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Formats a millisecond span into a compact human string, e.g. "2d 4h", "3h 12m", "8m".
 * Returns "—" for null/negative spans.
 */
export const formatDurationMs = (ms: number | null): string => {
    if (ms === null || ms < 0) return '—';

    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

/**
 * Elapsed span (in ms) between an opened timestamp and either a resolved timestamp
 * or `now`. Returns null when the opened timestamp is missing/unparseable.
 */
export const getElapsedMs = (openedAt?: string | null, endAt?: string | null, now: number = Date.now()): number | null => {
    const opened = parseLocalDate(openedAt);
    if (!opened) return null;
    const end = parseLocalDate(endAt);
    const endMs = end ? end.getTime() : now;
    return endMs - opened.getTime();
};

/**
 * "HH:MM:SS" clock string for an elapsed millisecond span (used by the top-bar elapsed clock).
 */
export const formatClock = (ms: number | null): string => {
    if (ms === null || ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
};
