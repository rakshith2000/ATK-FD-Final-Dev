/**
 * Takes a UTC date string, forces it to parse as UTC if missing the 'Z',
 * and returns a formatted local date string (e.g., "28 Jul 2026 10:00").
 * Returns the original string if parsing fails.
 */
export const formatUtcToLocal = (val?: string | null): string | null => {
    if (!val) return null;

    const isUTCFormatted = val.endsWith('Z') || val.includes('+');
    const utcString = isUTCFormatted ? val : `${val.replace(' ', 'T')}Z`;

    const date = new Date(utcString);

    // Return original value if it's an invalid date string
    if (Number.isNaN(date.getTime())) return val;

    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year} ${hours}:${minutes}`;
};
