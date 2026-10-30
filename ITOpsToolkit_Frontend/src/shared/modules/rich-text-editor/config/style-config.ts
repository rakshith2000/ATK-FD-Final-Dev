export const MIN_ALLOWED_FONT_SIZE = 8;
export const MAX_ALLOWED_FONT_SIZE = 72;

export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_SIZE_PX = `${DEFAULT_FONT_SIZE}px`;

export const DEFAULT_FONT_FAMILY = 'Arial';
export const DEFAULT_FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'];

export const parseAllowedFontSize = (input: string): string => {
    const match = input.match(/^(\d+(?:\.\d+)?)px$/);
    if (match) {
        const n = Number(match[1]);
        if (n >= MIN_ALLOWED_FONT_SIZE && n <= MAX_ALLOWED_FONT_SIZE) {
            return input;
        }
    }
    return '';
};

export const normalizeFontSize = (size?: number | string | null): number => {
    if (typeof size === 'number' && !isNaN(size) && size > 0) {
        return Math.max(MIN_ALLOWED_FONT_SIZE, Math.min(MAX_ALLOWED_FONT_SIZE, Math.round(size)));
    }
    if (typeof size === 'string') {
        const parsed = parseFloat(size);
        if (!isNaN(parsed) && parsed > 0) {
            return Math.max(MIN_ALLOWED_FONT_SIZE, Math.min(MAX_ALLOWED_FONT_SIZE, Math.round(parsed)));
        }
    }
    return DEFAULT_FONT_SIZE;
};

export const normalizeFontFamily = (family?: string | null, allowedFamilies: string[] = DEFAULT_FONT_FAMILIES): string => {
    if (family && allowedFamilies.includes(family)) {
        return family;
    }
    return allowedFamilies[0] || DEFAULT_FONT_FAMILY;
};

export function parseAllowedColor(input: string) {
    return /^rgb\(\d+, \d+, \d+\)$/.test(input) ? input : '';
}
