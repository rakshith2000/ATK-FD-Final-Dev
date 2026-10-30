import type { ConditionalValidation, FieldConfig, FieldValidation } from './types';

/** Validate a single value against FieldValidation rules imperatively */
function validateValueAgainstRules(value: unknown, rules: FieldValidation, allValues: Record<string, unknown>): string | undefined {
    if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
        return rules.minLengthMessage ?? `Minimum ${rules.minLength} characters`;
    }
    if (rules.maxLength !== undefined && typeof value === 'string' && value.length > rules.maxLength) {
        return rules.maxLengthMessage ?? `Maximum ${rules.maxLength} characters`;
    }
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        return rules.patternMessage ?? 'Invalid format';
    }
    // min/max for numbers
    if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        return rules.minMessage ?? `Minimum value is ${rules.min}`;
    }
    if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        return rules.maxMessage ?? `Maximum value is ${rules.max}`;
    }
    // min/max for arrays (multiselect)
    if (rules.min !== undefined && Array.isArray(value) && value.length < rules.min) {
        return rules.minMessage ?? `Select at least ${rules.min} item${rules.min === 1 ? '' : 's'}`;
    }
    if (rules.max !== undefined && Array.isArray(value) && value.length > rules.max) {
        return rules.maxMessage ?? `Select at most ${rules.max} item${rules.max === 1 ? '' : 's'}`;
    }
    // Date validation — static min/max
    if (rules.minDate !== undefined && typeof value === 'string' && value !== '' && value < rules.minDate) {
        return rules.minDateMessage ?? `Date must be on or after ${rules.minDate}`;
    }
    if (rules.maxDate !== undefined && typeof value === 'string' && value !== '' && value > rules.maxDate) {
        return rules.maxDateMessage ?? `Date must be on or before ${rules.maxDate}`;
    }
    // Date validation — cross-field min/max
    if (rules.minDateField !== undefined && typeof value === 'string' && value !== '') {
        const refValue = allValues[rules.minDateField];
        if (typeof refValue === 'string' && refValue !== '' && value < refValue) {
            return rules.minDateFieldMessage ?? `Must be on or after ${rules.minDateField}`;
        }
    }
    if (rules.maxDateField !== undefined && typeof value === 'string' && value !== '') {
        const refValue = allValues[rules.maxDateField];
        if (typeof refValue === 'string' && refValue !== '' && value > refValue) {
            return rules.maxDateFieldMessage ?? `Must be on or before ${rules.maxDateField}`;
        }
    }
    if (rules.custom) {
        return rules.custom(value, allValues);
    }
    return undefined;
}

/** Resolve which conditional validation rules apply given current form values */
function resolveConditionalRules(conditions: ConditionalValidation[], allValues: Record<string, unknown>): FieldValidation | undefined {
    const merged: FieldValidation = {};
    for (const cv of conditions) {
        const dep = cv.when;
        const applies = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
        if (applies) {
            Object.assign(merged, cv.rules);
        }
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Validate a single date string from a date-range tuple against date rules */
function validateDateRangeElement(value: string, rules: FieldValidation, allValues: Record<string, unknown>, label: string): string | undefined {
    if (rules.minDate !== undefined && value < rules.minDate) {
        return rules.minDateMessage ?? `${label} must be on or after ${rules.minDate}`;
    }
    if (rules.maxDate !== undefined && value > rules.maxDate) {
        return rules.maxDateMessage ?? `${label} must be on or before ${rules.maxDate}`;
    }
    if (rules.minDateField !== undefined) {
        const refValue = allValues[rules.minDateField];
        if (typeof refValue === 'string' && refValue !== '' && value < refValue) {
            return rules.minDateFieldMessage ?? `${label} must be on or after ${rules.minDateField}`;
        }
    }
    if (rules.maxDateField !== undefined) {
        const refValue = allValues[rules.maxDateField];
        if (typeof refValue === 'string' && refValue !== '' && value > refValue) {
            return rules.maxDateFieldMessage ?? `${label} must be on or before ${rules.maxDateField}`;
        }
    }
    return undefined;
}

/** Check if a value counts as "empty" for required validation */
function isEmpty(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

/**
 * Build an onDynamic validator function for a field.
 * Both static validation and conditional validation are applied together.
 * Returns undefined if no validation is needed.
 */
export function buildFieldValidator(fieldConfig: FieldConfig, getAllValues: () => Record<string, unknown>): ((opts: { value: unknown }) => string | undefined) | undefined {
    const hasRequired = fieldConfig.required;
    const hasRequiredWhen = !!fieldConfig.requiredWhen;
    const hasValidation = !!fieldConfig.validation;
    const hasConditionalValidation = !!fieldConfig.conditionalValidation && fieldConfig.conditionalValidation.length > 0;

    if (!hasRequired && !hasRequiredWhen && !hasValidation && !hasConditionalValidation) return undefined;

    return ({ value }: { value: unknown }) => {
        const allValues = getAllValues();

        // If hidden, skip validation entirely
        if (fieldConfig.hidden) return undefined;

        // If visibleWhen exists and field is not visible, skip validation
        if (fieldConfig.visibleWhen) {
            const dep = fieldConfig.visibleWhen;
            const visible = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
            if (!visible) return undefined;
        }

        // Required check (static)
        if (hasRequired && isEmpty(value)) {
            return `${fieldConfig.label} is required`;
        }

        // Required check (conditional - requiredWhen)
        if (hasRequiredWhen && !hasRequired) {
            const dep = fieldConfig.requiredWhen!;
            const isRequired = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
            if (isRequired && isEmpty(value)) {
                return `${fieldConfig.label} is required`;
            }
        }

        // Apply static validation rules
        if (hasValidation) {
            const error = validateValueAgainstRules(value, fieldConfig.validation!, allValues);
            if (error) return error;
        }

        // Apply conditional validation rules (both run together with static)
        if (hasConditionalValidation) {
            const conditionalRules = resolveConditionalRules(fieldConfig.conditionalValidation!, allValues);
            if (conditionalRules) {
                const error = validateValueAgainstRules(value, conditionalRules, allValues);
                if (error) return error;
            }
        }

        // Date-range: validate each element of the tuple against date rules
        if (fieldConfig.type === 'date-range' && Array.isArray(value)) {
            const activeRules = hasConditionalValidation
                ? { ...fieldConfig.validation, ...resolveConditionalRules(fieldConfig.conditionalValidation!, allValues) }
                : fieldConfig.validation;
            if (activeRules) {
                const [start, end] = value as [string | undefined, string | undefined];
                if (start) {
                    const err = validateDateRangeElement(start, activeRules, allValues, 'Start date');
                    if (err) return err;
                }
                if (end) {
                    const err = validateDateRangeElement(end, activeRules, allValues, 'End date');
                    if (err) return err;
                }
            }
        }

        return undefined;
    };
}
