/**
 * Takes a local date string (or Date object) and returns a formatted string
 * (e.g., "28 Jul 2026 10:00"). Returns the original string if parsing fails.
 */
export const formatLocalDate = (val?: string | Date | null): string | null => {
    if (!val) return null;

    let date: Date;

    if (typeof val === 'string') {
        // Replace spaces with 'T' for cross-browser support (e.g., Safari),
        // but DO NOT append 'Z' so it remains in the user's local timezone.
        const localString = val.includes('T') ? val : val.replace(' ', 'T');
        date = new Date(localString);
    } else {
        // If it's already a Date object, use it directly
        date = val;
    }

    // Return original value if it's an invalid date string
    if (Number.isNaN(date.getTime())) {
        return typeof val === 'string' ? val : null;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year} ${hours}:${minutes}`;
};
