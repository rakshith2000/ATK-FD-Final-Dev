export interface FormatMeetingDateOptions {
    withTime?: boolean;
    fallback?: string;
}

export function formatMeetingDate(iso: string | null | undefined, { withTime = false, fallback = 'NA' }: FormatMeetingDateOptions = {}): string {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    return withTime ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
