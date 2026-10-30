/**
 * Safely extracts only the 'display_value' from a ServiceNow object field
 */
export const getSnowFieldDisplayValue = (field: unknown, fallback = ''): string => {
    if (typeof field !== 'object' || field === null) return fallback;

    const obj = field as { display_value?: unknown };

    if (typeof obj.display_value === 'string' && obj.display_value.trim().length > 0) {
        return obj.display_value;
    }

    return fallback;
};

/**
 * Safely extracts only the 'value' from a ServiceNow object field
 */
export const getSnowFieldValue = (field: unknown, fallback = ''): string => {
    if (typeof field !== 'object' || field === null) return fallback;

    const obj = field as { value?: unknown };

    if (typeof obj.value === 'string' && obj.value.trim().length > 0) {
        return obj.value;
    }

    return fallback;
};

/**
 * Handles basic primitive field values (strings, numbers, booleans)
 */
export const getPrimitiveFieldValue = (field: unknown, fallback = ''): string => {
    if (field === null || field === undefined) return fallback;
    if (typeof field === 'string') return field || fallback;
    if (typeof field === 'number' || typeof field === 'boolean') return String(field);

    return fallback;
};

/**
 * COMBINED FUNCTION:
 * Handles primitives, then falls back to Snow object properties.
 * Prioritizes display_value over value for objects.
 */
export const getSnowFieldValueOrDisplay = (field: unknown, fallback = ''): string => {
    // 1. Fast fail for null/undefined
    if (field === null || field === undefined) return fallback;

    // 2. Handle primitive types directly
    if (typeof field !== 'object') {
        return getPrimitiveFieldValue(field, fallback);
    }

    // 3. Handle object types (ServiceNow reference/choice fields)
    const displayValue = getSnowFieldDisplayValue(field, '');
    if (displayValue !== '') return displayValue;

    const rawValue = getSnowFieldValue(field, '');
    if (rawValue !== '') return rawValue;

    // 4. Complete fallback
    return fallback;
};
