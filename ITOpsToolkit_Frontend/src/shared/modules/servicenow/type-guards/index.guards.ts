import type { SnowFieldWithReferenceLink, SnowFieldWithValueAndDisplayText } from '../types';

function isStringOrNull(value: unknown): value is string | null {
    return typeof value === 'string' || value === null;
}

export function isSnowFieldWithValueAndDisplayText(obj: unknown): obj is SnowFieldWithValueAndDisplayText {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'display_value' in obj &&
        'value' in obj &&
        isStringOrNull((obj as SnowFieldWithValueAndDisplayText).display_value) &&
        isStringOrNull((obj as SnowFieldWithValueAndDisplayText).value)
    );
}

export function isSnowFieldWithReferenceLink(obj: unknown): obj is SnowFieldWithReferenceLink {
    return isSnowFieldWithValueAndDisplayText(obj) && (!('link' in obj) || typeof (obj as SnowFieldWithReferenceLink).link === 'string');
}
