import { z } from 'zod';
import type { ConditionalValidation, FieldConfig, FieldValidation } from './types';

/** Apply static FieldValidation rules to a base Zod schema for the given field type */
function applyStaticRules(field: FieldConfig, rules: FieldValidation): z.ZodTypeAny {
    switch (field.type) {
        case 'text':
        case 'password':
        case 'textarea':
        case 'select':
        case 'date':
        case 'datetime': {
            let s = z.string();
            if (rules.minLength !== undefined) {
                s = s.min(rules.minLength, rules.minLengthMessage ?? `Minimum ${rules.minLength} characters`);
            }
            if (rules.maxLength !== undefined) {
                s = s.max(rules.maxLength, rules.maxLengthMessage ?? `Maximum ${rules.maxLength} characters`);
            }
            if (rules.pattern) {
                s = s.regex(rules.pattern, rules.patternMessage ?? 'Invalid format');
            }
            return s;
        }
        case 'number': {
            let n = z.number();
            if (rules.min !== undefined) {
                n = n.min(rules.min, rules.minMessage ?? `Minimum value is ${rules.min}`);
            }
            if (rules.max !== undefined) {
                n = n.max(rules.max, rules.maxMessage ?? `Maximum value is ${rules.max}`);
            }
            return n;
        }
        case 'multiselect': {
            let a = z.array(z.string());
            if (rules.min !== undefined) {
                a = a.min(rules.min, rules.minMessage ?? `Select at least ${rules.min} item${rules.min === 1 ? '' : 's'}`);
            }
            if (rules.max !== undefined) {
                a = a.max(rules.max, rules.maxMessage ?? `Select at most ${rules.max} item${rules.max === 1 ? '' : 's'}`);
            }
            return a;
        }
        case 'checkbox':
            return z.boolean();
        default:
            return baseSchemaForType(field.type);
    }
}

/** Return a bare Zod schema (no validation rules) for a field type */
function baseSchemaForType(type: FieldConfig['type']): z.ZodTypeAny {
    switch (type) {
        case 'text':
        case 'password':
        case 'textarea':
        case 'select':
        case 'date':
        case 'datetime':
            return z.string();
        case 'number':
            return z.number();
        case 'checkbox':
            return z.boolean();
        case 'multiselect':
            return z.array(z.string());
        case 'date-range':
            return z.tuple([z.string().optional(), z.string().optional()]);
        case 'number-range':
            return z.tuple([z.number().optional(), z.number().optional()]);
        default:
            return z.unknown();
    }
}

/** Validate a single value against FieldValidation rules imperatively (for conditional validation) */
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
    if (rules.custom) {
        return rules.custom(value, allValues);
    }
    return undefined;
}

export function buildZodSchema(fields: FieldConfig[]): z.ZodTypeAny {
    const shape: Record<string, z.ZodTypeAny> = {};
    const conditionalFields: { name: string; conditions: ConditionalValidation[] }[] = [];

    for (const field of fields) {
        let schema: z.ZodTypeAny;

        // Build field-level schema with static rules
        if (field.validation) {
            schema = applyStaticRules(field, field.validation);
        } else {
            schema = baseSchemaForType(field.type);
        }

        // Apply custom validation via superRefine (static only)
        if (field.validation?.custom) {
            const customFn = field.validation.custom;
            schema = schema.superRefine((val, ctx) => {
                const error = customFn(val, {});
                if (error) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
                }
            });
        }

        // If hidden, visibleWhen, or requiredWhen is set, always optional regardless of required
        if (field.hidden || field.visibleWhen || field.requiredWhen) {
            schema = schema.optional();
        } else if (!field.required) {
            schema = schema.optional();
        }

        shape[field.name] = schema;

        // Collect conditional validation arrays for object-level superRefine
        if (field.conditionalValidation && field.conditionalValidation.length > 0) {
            conditionalFields.push({
                name: field.name,
                conditions: field.conditionalValidation,
            });
        }
    }

    let objectSchema: z.ZodTypeAny = z.object(shape);

    // Add object-level superRefine for conditional validation
    if (conditionalFields.length > 0) {
        objectSchema = (objectSchema as z.ZodObject<Record<string, z.ZodTypeAny>>).superRefine((data, ctx) => {
            for (const { name, conditions } of conditionalFields) {
                for (const cv of conditions) {
                    const dep = cv.when;
                    const applies = 'fields' in dep ? dep.condition(data as Record<string, unknown>) : dep.condition(data[dep.field], data as Record<string, unknown>);

                    if (applies) {
                        const error = validateValueAgainstRules(data[name], cv.rules, data as Record<string, unknown>);
                        if (error) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: error,
                                path: [name],
                            });
                        }
                    }
                }
            }
        });
    }

    return objectSchema;
}
