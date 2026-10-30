/**
 * Converts a serializable FormConfigRecord (JSON from DB) into
 * a runtime FormConfig usable by DynamicForm.
 */
import type { FieldConfig, FieldDependency, FieldValidation, ConditionalValidation, FormConfig, SelectOption, AsyncFieldValidation } from '@/shared/modules/dynamic-form/types';
import type {
    ApiClientType,
    ConditionOperator,
    FormConfigRecord,
    MultiFieldCondition,
    SerializableAsyncOptions,
    SerializableAsyncValidation,
    SerializableCondition,
    SerializableConditionalValidation,
    SerializableFieldConfig,
    SerializableOnChangeEffect,
    SerializableValidation,
} from '../types/form-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import type { AxiosInstance } from 'axios';
import type { QueryClient } from '@tanstack/react-query';

// API client selection
function getApiClient(type?: ApiClientType): AxiosInstance {
    return type === 'service-now' ? serviceNowApiClient : backendApiClient;
}

//  Condition evaluation
function evaluateOperator(fieldValue: unknown, operator: ConditionOperator, compareValue?: unknown): boolean {
    switch (operator) {
        case 'equals':
            return fieldValue === compareValue;
        case 'not_equals':
            return fieldValue !== compareValue;
        case 'not_empty':
            return fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'empty':
            return fieldValue === undefined || fieldValue === null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'contains':
            if (Array.isArray(fieldValue)) return fieldValue.includes(compareValue);
            return typeof fieldValue === 'string' && typeof compareValue === 'string' && fieldValue.includes(compareValue);
        case 'in':
            return Array.isArray(compareValue) && compareValue.includes(fieldValue);
        case 'not_in':
            return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
        case 'gt':
            if (typeof fieldValue === 'number' && typeof compareValue === 'number') return fieldValue > compareValue;
            if (typeof fieldValue === 'string' && typeof compareValue === 'string') return fieldValue > compareValue;
            return false;
        case 'lt':
            if (typeof fieldValue === 'number' && typeof compareValue === 'number') return fieldValue < compareValue;
            if (typeof fieldValue === 'string' && typeof compareValue === 'string') return fieldValue < compareValue;
            return false;
        case 'gte':
            if (typeof fieldValue === 'number' && typeof compareValue === 'number') return fieldValue >= compareValue;
            if (typeof fieldValue === 'string' && typeof compareValue === 'string') return fieldValue >= compareValue;
            return false;
        case 'lte':
            if (typeof fieldValue === 'number' && typeof compareValue === 'number') return fieldValue <= compareValue;
            if (typeof fieldValue === 'string' && typeof compareValue === 'string') return fieldValue <= compareValue;
            return false;
        default:
            return false;
    }
}

function isMultiCondition(c: SerializableCondition): c is MultiFieldCondition {
    return 'join' in c;
}

/** Resolve the value for a condition field reference.
 *  - `"meta:keyName"` -> reads from the meta object
 *  - `"initialValue:keyName"` -> reads from initial values
 *  - `"fieldName"` -> reads from form values (allValues) - default */
function resolveConditionField(field: string, allValues: Record<string, unknown>, meta: Record<string, unknown>, initialValues?: Record<string, unknown>): unknown {
    if (field.startsWith('meta:')) return getAtPath(meta, field.slice(5));
    if (field.startsWith('initialValue:')) return getAtPath(initialValues ?? {}, field.slice(13));
    return allValues[field];
}

/** Resolve a condition compare-value.
 *  Supports prefixed templates: `{meta:key}`, `{field:key}`, `{initialValue:key}`.
 *  Non-template values return as-is (static literal). */
function resolveConditionValue(value: unknown, allValues: Record<string, unknown>, meta: Record<string, unknown>, initialValues?: Record<string, unknown>): unknown {
    if (typeof value !== 'string') return value;
    if (!isTemplate(value)) return value;
    const sources: TemplateSources = { meta, field: allValues, initialValue: initialValues };
    return resolveTemplate(value, sources);
}

function buildConditionFn(
    condition: SerializableCondition,
    meta?: Record<string, unknown>,
    initialValues?: Record<string, unknown>,
): (allValues: Record<string, unknown>) => boolean {
    const m = meta ?? {};
    if (isMultiCondition(condition)) {
        return (allValues) => {
            const results = condition.conditions.map((c) =>
                evaluateOperator(resolveConditionField(c.field, allValues, m, initialValues), c.operator, resolveConditionValue(c.value, allValues, m, initialValues)),
            );
            return condition.join === 'and' ? results.every(Boolean) : results.some(Boolean);
        };
    }
    return (allValues) =>
        evaluateOperator(
            resolveConditionField(condition.field, allValues, m, initialValues),
            condition.operator,
            resolveConditionValue(condition.value, allValues, m, initialValues),
        );
}

//  Condition -> FieldDependency
/** Check if a condition field reference is a form field (not meta: or initialValue:) */
function isFormFieldRef(field: string): boolean {
    return !field.startsWith('meta:') && !field.startsWith('initialValue:');
}

function toFieldDependency(condition: SerializableCondition, meta?: Record<string, unknown>, initialValues?: Record<string, unknown>): FieldDependency {
    const conditionFn = buildConditionFn(condition, meta, initialValues);
    if (isMultiCondition(condition)) {
        // Only track form fields as dependencies (not meta:/initialValue: - those are static context)
        const formFields = condition.conditions.map((c) => c.field).filter(isFormFieldRef);
        return {
            fields: formFields,
            condition: conditionFn,
        };
    }
    // If the field is a non-form reference, use a dummy dependency that always re-evaluates
    if (!isFormFieldRef(condition.field)) {
        return {
            fields: [],
            condition: conditionFn,
        };
    }
    return {
        field: condition.field,
        condition: (_value: unknown, allValues: Record<string, unknown>) => conditionFn(allValues),
    };
}

//  Validation conversion
function toValidation(v: SerializableValidation): FieldValidation {
    const result: FieldValidation = {};
    if (v.min !== undefined) result.min = v.min;
    if (v.minMessage) result.minMessage = v.minMessage;
    if (v.max !== undefined) result.max = v.max;
    if (v.maxMessage) result.maxMessage = v.maxMessage;
    if (v.minLength !== undefined) result.minLength = v.minLength;
    if (v.minLengthMessage) result.minLengthMessage = v.minLengthMessage;
    if (v.maxLength !== undefined) result.maxLength = v.maxLength;
    if (v.maxLengthMessage) result.maxLengthMessage = v.maxLengthMessage;
    if (v.pattern) result.pattern = new RegExp(v.pattern);
    if (v.patternMessage) result.patternMessage = v.patternMessage;
    // Date-specific validation
    if (v.minDate) result.minDate = v.minDate;
    if (v.minDateMessage) result.minDateMessage = v.minDateMessage;
    if (v.maxDate) result.maxDate = v.maxDate;
    if (v.maxDateMessage) result.maxDateMessage = v.maxDateMessage;
    if (v.minDateField) result.minDateField = v.minDateField;
    if (v.minDateFieldMessage) result.minDateFieldMessage = v.minDateFieldMessage;
    if (v.maxDateField) result.maxDateField = v.maxDateField;
    if (v.maxDateFieldMessage) result.maxDateFieldMessage = v.maxDateFieldMessage;
    return result;
}

function toConditionalValidation(items: SerializableConditionalValidation[], meta?: Record<string, unknown>, initialValues?: Record<string, unknown>): ConditionalValidation[] {
    return items.map((item) => ({
        when: toFieldDependency(item.when, meta, initialValues),
        rules: toValidation(item.rules),
    }));
}

//  Async options conversion
function getAtPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key) => {
        if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

/** Build a params object from dependency values.
 *  Maps each dependsOn field name to its current form value, filtering empty values. */
function buildDependencyParams(ao: SerializableAsyncOptions, depVal?: unknown): Record<string, unknown> {
    const depFields = Array.isArray(ao.dependsOn) ? ao.dependsOn : ao.dependsOn ? [ao.dependsOn] : [];
    if (depFields.length === 0) return {};

    const fieldValues: Record<string, unknown> = {};
    if (Array.isArray(depVal)) {
        depFields.forEach((field, i) => {
            fieldValues[field] = (depVal as unknown[])[i];
        });
    } else {
        fieldValues[depFields[0]] = depVal;
    }

    // Filter empty values
    const params: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(fieldValues)) {
        if (value === undefined || value === null || value === '') continue;
        params[field] = value;
    }
    return params;
}

/** Check if a key string is a template with {placeholders} */
function isTemplate(key: string): boolean {
    return /\{[^}]{1,500}\}/.test(key);
}

//  Prefixed template system
//
//  Every template MUST use a prefix - bare {key} is NOT supported:
//    {meta:key}           -> from runtime meta object
//    {field:key}          -> from current form field values
//    {field:key.subkey}   -> nested dot-path from field values
//    {initialValue:key}   -> from initial values response (pre-mapped)
//    {response:key}       -> from API response data (labelKey/valueKey, fieldMapping)

/** All available template sources for the prefixed template system.
 *  - `meta` - runtime meta object (context from page code)
 *  - `field` - current form field values
 *  - `initialValue` - initial values (mapped form-ready values)
 *  - `response` - raw API response data (used in labelKey/valueKey, fieldMapping) */
export interface TemplateSources {
    meta?: Record<string, unknown>;
    field?: Record<string, unknown>;
    initialValue?: Record<string, unknown>;
    response?: Record<string, unknown>;
}

const PREFIX_REGEX = /^(meta|field|initialValue|response):(.+)$/;

/** Resolve a single `{prefix:key}` token against available sources.
 *  Only prefixed tokens are resolved. Bare tokens (no prefix) return undefined. */
function resolveToken(token: string, sources: TemplateSources): unknown {
    const prefixMatch = PREFIX_REGEX.exec(token);
    if (prefixMatch) {
        const [, prefix, key] = prefixMatch;
        const src = sources[prefix as keyof TemplateSources];
        return src ? getAtPath(src, key) : undefined;
    }
    // Bare token - not resolved (validation layer catches these as errors)
    return undefined;
}

/** Resolve all `{prefix:key}` templates in a string using available sources.
 *  Returns the original string if no templates found. */
export function resolveTemplate(template: string, sources: TemplateSources): string {
    if (!isTemplate(template)) return template;
    return template.replace(/\{([^}]{1,500})\}/g, (_, token) => {
        const val = resolveToken(token, sources);
        return val !== undefined && val !== null ? String(val) : '';
    });
}

/** Check if a template string contains any {field:...} tokens that need runtime resolution */
export function hasFieldTemplates(value: string): boolean {
    return /\{field:[^}]{1,500}\}/.test(value);
}

/** Resolve a key: if it contains `{prefix:key}` placeholders, replace them dynamically;
 *  otherwise return the bare string as a static literal.
 *  Supports all prefixes: `{meta:key}`, `{response:key}`, `{field:key}`, `{initialValue:key}`. */
function resolveKey(item: unknown, key: string, sources?: TemplateSources): string {
    if (!isTemplate(key)) return key;
    const itemRecord = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const allSources: TemplateSources = { ...sources, response: itemRecord };
    return resolveTemplate(key, allSources);
}

/** Replace `{prefix:key}` tokens in a URL with values from sources.
 *  Only prefixed tokens are resolved. Unresolved placeholders are left as-is. */
function resolveUrlTemplate(url: string, params: Record<string, unknown>, sources?: TemplateSources): string {
    const allSources: TemplateSources = { meta: params, ...sources };
    return url.replace(/\{([^}]{1,500})\}/g, (match, token) => {
        const val = resolveToken(token, allSources);
        return val !== undefined && val !== null ? encodeURIComponent(String(val)) : match;
    });
}

/** Resolve templates in a queryKey string array.
 *  Supports prefixed templates: `{meta:key}`, `{field:key}`, `{initialValue:key}`. */
function resolveQueryKey(queryKey: string[], meta: Record<string, unknown>, sources?: TemplateSources): string[] {
    const allSources: TemplateSources = { meta, ...sources };
    return queryKey.map((segment) => {
        if (!isTemplate(segment)) return segment;
        return resolveTemplate(segment, allSources);
    });
}

/** Resolve templates in a Record's values.
 *  Supports prefixed templates: `{meta:key}`, `{field:key}`, `{initialValue:key}`. */
function resolveTemplateValues(params: Record<string, unknown>, meta: Record<string, unknown>, sources?: TemplateSources): Record<string, unknown> {
    const allSources: TemplateSources = { meta, ...sources };
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(params)) {
        if (typeof val === 'string') {
            resolved[key] = isTemplate(val) ? resolveTemplate(val, allSources) : val;
        } else if (val && typeof val === 'object') {
            resolved[key] = resolveTemplateValues(val as Record<string, unknown>, meta, sources);
        } else {
            resolved[key] = val;
        }
    }
    return resolved;
}

/** Append query params to a URL string, skipping empty values */
function appendQueryParams(url: string, params: Record<string, unknown>): string {
    let result = url;
    for (const [key, val] of Object.entries(params)) {
        if (val === undefined || val === null || val === '') continue;
        const separator = result.includes('?') ? '&' : '?';
        result += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`;
    }
    return result;
}

/** Find which dependency field keys are consumed by {field:key} templates in URL and requestParams.
 *  These keys should NOT be appended as separate query/body params since they're already embedded. */
function findConsumedFieldKeys(ao: SerializableAsyncOptions, depParams: Record<string, unknown>): Set<string> {
    const consumed = new Set<string>();
    const fieldRegex = /\{field:([^}]{1,500})\}/g;

    // Check URL
    for (const m of ao.url.matchAll(fieldRegex)) {
        const key = m[1].split('.')[0];
        if (key in depParams) consumed.add(key);
    }

    const checkValue = (v: unknown) => {
        if (typeof v === 'string') {
            for (const m of v.matchAll(fieldRegex)) {
                const key = m[1].split('.')[0];
                if (key in depParams) consumed.add(key);
            }
        } else if (v && typeof v === 'object') {
            const dict = v as Record<string, unknown>;
            for (const sv of Object.values(dict)) {
                checkValue(sv);
            }
        }
    };

    // Check queryParams values
    if (ao.requestParams?.queryParams) {
        for (const val of Object.values(ao.requestParams.queryParams)) {
            checkValue(val);
        }
    }

    // Check bodyParams values
    if (ao.requestParams?.bodyParams) {
        for (const val of Object.values(ao.requestParams.bodyParams)) {
            checkValue(val);
        }
    }

    return consumed;
}

function toAsyncOptions(ao: SerializableAsyncOptions, meta?: Record<string, unknown>) {
    const labelKey = ao.labelKey ?? '{response:label}';
    const valueKey = ao.valueKey ?? '{response:value}';
    const isPost = (ao.method ?? 'GET').toUpperCase() === 'POST';
    const m = meta ?? {};
    const client = getApiClient(ao.apiClient);
    const metaSources: TemplateSources = { meta: m };

    const mapResponseFn = (data: unknown): SelectOption[] => {
        const items = ao.responsePath ? getAtPath(data, ao.responsePath) : data;
        if (!Array.isArray(items)) return [];
        return items.map((item: unknown) => ({
            label: resolveKey(item, labelKey, metaSources),
            value: resolveKey(item, valueKey, metaSources),
        }));
    };

    // Always generate a queryFn for full control over GET/POST + param mapping
    return {
        queryKey: (depVal?: unknown) => {
            const depParams = buildDependencyParams(ao, depVal);
            const fieldSources: TemplateSources = { meta: m, field: depParams };
            return ao.queryKey ? [...resolveQueryKey(ao.queryKey, m, fieldSources), depVal] : ['async-options', resolveUrlTemplate(ao.url, m, fieldSources), depVal];
        },
        queryFn: async (depVal?: unknown, searchTerm?: string): Promise<SelectOption[]> => {
            const depParams = buildDependencyParams(ao, depVal);

            // Build sources with meta + dependency field values for template resolution
            const querySources: TemplateSources = { meta: m, field: depParams };

            // Resolve requestParams templates at query time so {field:key} has dep values
            const resolvedQueryParams = ao.requestParams?.queryParams ? resolveTemplateValues(ao.requestParams.queryParams, m, querySources) : {};
            const resolvedBodyParams = ao.requestParams?.bodyParams ? resolveTemplateValues(ao.requestParams.bodyParams, m, querySources) : {};

            // Resolve URL path templates from meta + dep params
            let resolvedUrl = resolveUrlTemplate(ao.url, m, querySources);

            // Filter out dep params that were already consumed by templates in URL or queryParams
            const consumedDepKeys = findConsumedFieldKeys(ao, depParams);
            const remainingDepParams: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(depParams)) {
                if (!consumedDepKeys.has(key)) remainingDepParams[key] = val;
            }

            let response;
            if (isPost) {
                // POST: merge resolved body + unconsumed dep params as JSON body, append query params
                const body = { ...resolvedBodyParams, ...remainingDepParams };
                resolvedUrl = appendQueryParams(resolvedUrl, resolvedQueryParams);
                response = await client.post(resolvedUrl, Object.keys(body).length > 0 ? body : undefined);
            } else {
                // GET: append unconsumed dep params + resolved query params as query string
                // When searchable, append the search expression to the target query key's value
                const mergedQueryParams = { ...remainingDepParams, ...resolvedQueryParams };
                if (ao.searchable && searchTerm) {
                    let searchParamPattern = ao.searchQueryParam ?? (ao.apiClient === 'service-now' ? 'nameLIKE{searchTerm}' : '{searchTerm}');
                    // Replace {searchTerm} first so resolveTemplate doesn't swallow it as an unknown token
                    searchParamPattern = searchParamPattern.replace('{searchTerm}', searchTerm);
                    // Then resolve remaining template contracts ({meta:...}, {field:...}, etc.)
                    const searchExpr = resolveTemplate(searchParamPattern, querySources);
                    const queryKey = ao.searchQueryKey ?? (ao.apiClient === 'service-now' ? 'sysparm_query' : 'search');
                    const separator = ao.searchQuerySeparator ?? (ao.apiClient === 'service-now' ? '^' : '&');
                    const existing = mergedQueryParams[queryKey];
                    if (existing && typeof existing === 'string') {
                        mergedQueryParams[queryKey] = `${existing}${separator}${searchExpr}`;
                    } else {
                        mergedQueryParams[queryKey] = searchExpr;
                    }
                }
                resolvedUrl = appendQueryParams(resolvedUrl, mergedQueryParams);
                response = await client.get(resolvedUrl);
            }

            return mapResponseFn(response.data);
        },
        dependsOn: ao.dependsOn,
        debounceMs: ao.debounceMs,
        ...(ao.searchable
            ? {
                  searchable: true,
                  searchDebounceMs: ao.searchDebounceMs,
                  apiClient: ao.apiClient,
                  searchQueryKey: ao.searchQueryKey,
                  searchQueryParam: ao.searchQueryParam,
                  searchQuerySeparator: ao.searchQuerySeparator,
              }
            : {}),
    };
}

//  Async validation conversion
function toAsyncValidation(av: SerializableAsyncValidation): AsyncFieldValidation {
    return {
        debounceMs: av.debounceMs ?? 500,
        validate: async (value: unknown) => {
            if (value === undefined || value === null || value === '') return undefined;
            try {
                const method = (av.method ?? 'GET').toLowerCase() as 'get' | 'post';
                const response = method === 'post' ? await backendApiClient.post(av.url, { value }) : await backendApiClient.get(av.url, { params: { value } });
                if (av.errorPath) {
                    const error = getAtPath(response.data, av.errorPath);
                    return error ? String(error) : undefined;
                }
                // If response has an error/message field, treat it as validation error
                const data = response.data as Record<string, unknown>;
                if (data?.error) return String(data.error);
                if (data?.message && typeof data.message === 'string' && data.message.toLowerCase().includes('error')) {
                    return data.message;
                }
                return undefined;
            } catch {
                return 'Validation request failed';
            }
        },
    };
}

//  Field conversion
/** Resolve templates in a string at conversion time.
 *  Resolves `{meta:key}` and `{initialValue:key}` immediately.
 *  Leaves `{field:key}` unresolved for runtime resolution in DynamicField.
 *  Bare `{key}` tokens are NOT resolved - they are validation errors. */
function resolveConversionTemplate(value: string, sources: TemplateSources): string {
    if (!isTemplate(value)) return value;
    return value.replace(/\{([^}]{1,500})\}/g, (match, token) => {
        const prefixMatch = PREFIX_REGEX.exec(token);
        if (!prefixMatch) return match; // Bare token - leave as-is (validation error)
        const [, prefix, key] = prefixMatch;
        // Leave {field:key} for runtime resolution
        if (prefix === 'field') return match;
        const src = sources[prefix as keyof TemplateSources];
        const val = src ? getAtPath(src, key) : undefined;
        return val !== undefined && val !== null ? String(val) : '';
    });
}

//  onChange effects conversion

/** Build a runtime onChange handler from declarative onChangeEffects.
 *  The handler evaluates each effect's condition (if any) against the current
 *  form values (with the new value already applied) and sets the target field. */
function toOnChange(
    fieldName: string,
    effects: SerializableOnChangeEffect[],
    meta?: Record<string, unknown>,
    initialValues?: Record<string, unknown>,
): (value: unknown, formApi: unknown) => void {
    const m = meta ?? {};

    // Pre-build condition functions for effects that have them
    const compiled = effects.map((effect) => ({
        setField: effect.setField,
        setValue: effect.setValue,
        conditionFn: effect.when ? buildConditionFn(effect.when, meta, initialValues) : null,
    }));

    return (value: unknown, formApi: unknown) => {
        const api = formApi as {
            setFieldValue: (name: string, value: unknown) => void;
            getFieldValue: (name: string) => unknown;
            store: { state: { values: Record<string, unknown> } };
        };
        // Build allValues snapshot with the new value already applied
        const allValues = { ...api.store.state.values, [fieldName]: value };

        for (const effect of compiled) {
            // Evaluate condition if present
            if (effect.conditionFn && !effect.conditionFn(allValues)) continue;

            // Resolve setValue - support {field:key} templates
            let resolvedValue: unknown = effect.setValue;
            if (typeof effect.setValue === 'string' && isTemplate(effect.setValue)) {
                const sources: TemplateSources = { meta: m, field: allValues, initialValue: initialValues };
                resolvedValue = resolveTemplate(effect.setValue, sources);
            }

            api.setFieldValue(effect.setField, resolvedValue);
        }
    };
}

function getFallbackOptions(
    fieldName: string,
    val: unknown,
    rawInitialValues?: Record<string, unknown>,
    fieldMapping?: Record<string, unknown>,
    asyncOptions?: SerializableAsyncOptions,
    meta?: Record<string, unknown>,
): SelectOption[] {
    if (val === undefined || val === null || val === '') return [];
    if (!rawInitialValues) return [];

    // Helper to safely split values/labels (handles array, comma-separated string, or primitive)
    const splitValues = (v: unknown): string[] => {
        if (Array.isArray(v)) return v.map(String);
        if (typeof v === 'string') {
            return v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
        if (v !== undefined && v !== null && v !== '') {
            return [String(v)];
        }
        return [];
    };

    const values = splitValues(val);
    if (values.length === 0) return [];

    // Helper to pair list of values with a list of display labels
    const pairValuesAndLabels = (valsList: string[], labelsList: string[]): SelectOption[] => {
        const result: SelectOption[] = [];
        for (let i = 0; i < values.length; i++) {
            const targetVal = values[i];
            const idx = valsList.indexOf(targetVal);
            if (idx !== -1 && idx < labelsList.length) {
                result.push({ label: labelsList[idx], value: targetVal });
            } else if (valsList.length === labelsList.length && idx !== -1) {
                result.push({ label: labelsList[idx], value: targetVal });
            } else {
                // If not found in the values list, check if we can pair by index directly
                if (valsList.length === values.length && labelsList.length === values.length) {
                    result.push({ label: labelsList[i], value: targetVal });
                } else {
                    result.push({ label: targetVal, value: targetVal });
                }
            }
        }
        return result;
    };

    // Option 1: Explicit initial option mapping templates configured on asyncOptions
    if (asyncOptions?.initialOptionLabelKey && asyncOptions?.initialOptionValueKey) {
        const labelTemplate = asyncOptions.initialOptionLabelKey;
        const valueTemplate = asyncOptions.initialOptionValueKey;

        const sources = { initialValue: rawInitialValues, response: rawInitialValues, meta: meta ?? {} };
        const labelText = resolveTemplate(labelTemplate, sources);
        const valueText = resolveTemplate(valueTemplate, sources);

        if (labelText && valueText) {
            const rawValues = splitValues(valueText);
            const rawLabels = splitValues(labelText);
            const paired = pairValuesAndLabels(rawValues, rawLabels);
            if (paired.length > 0) return paired;
        }
    }

    // Resolve rawVal (the nested object)
    let rawVal: unknown = getAtPath(rawInitialValues, fieldName);
    if (rawVal === undefined || rawVal === null) {
        if (fieldMapping && fieldMapping[fieldName]) {
            const mappingStr = fieldMapping[fieldName];
            if (typeof mappingStr === 'string') {
                const match = /\{response:([^}]+)\}/.exec(mappingStr);
                if (match) {
                    const path = match[1];
                    if (path.endsWith('.value') || path.endsWith('.display_value')) {
                        const basePath = path.substring(0, path.lastIndexOf('.'));
                        rawVal = getAtPath(rawInitialValues, basePath);
                    } else {
                        rawVal = getAtPath(rawInitialValues, path);
                    }
                }
            }
        }
    }

    // Option 1.5: If rawVal is an array of objects/primitives
    if (Array.isArray(rawVal)) {
        const resolved: SelectOption[] = [];
        for (const item of rawVal) {
            if (item && typeof item === 'object') {
                if (asyncOptions?.labelKey && asyncOptions?.valueKey) {
                    const labelText = resolveTemplate(asyncOptions.labelKey, { response: item });
                    const valueText = resolveTemplate(asyncOptions.valueKey, { response: item });
                    if (labelText && valueText) {
                        resolved.push({ label: labelText, value: valueText });
                    }
                } else {
                    const dict = item as Record<string, unknown>;
                    const l = dict.display_value || dict.name || dict.label || dict.title;
                    const v = dict.value || dict.sys_id || dict.id || dict.code;
                    if (l !== undefined && v !== undefined) {
                        resolved.push({ label: String(l), value: String(v) });
                    }
                }
            } else if (item !== undefined && item !== null) {
                resolved.push({ label: String(item), value: String(item) });
            }
        }
        if (resolved.length > 0) return resolved;
    }

    // Option 2: Direct choice/reference fallback (display_value and value)
    if (rawVal && typeof rawVal === 'object' && rawVal !== null) {
        const dict = rawVal as Record<string, unknown>;
        const display = dict.display_value;
        const value = dict.value;

        if (value !== undefined && display !== undefined && display !== null && display !== '') {
            const rawValues = splitValues(value);
            const rawLabels = splitValues(display);
            const paired = pairValuesAndLabels(rawValues, rawLabels);
            if (paired.length > 0) return paired;
        }
    }

    // Option 3: Template-based custom resolution using asyncOptions labelKey / valueKey (for custom schemas)
    if (rawVal && typeof rawVal === 'object' && rawVal !== null) {
        if (asyncOptions?.labelKey && asyncOptions?.valueKey) {
            const labelTemplate = asyncOptions.labelKey;
            const valueTemplate = asyncOptions.valueKey;

            const sources = { response: rawVal as Record<string, unknown> };
            const labelText = resolveTemplate(labelTemplate, sources);
            const valueText = resolveTemplate(valueTemplate, sources);

            if (labelText && valueText) {
                const rawValues = splitValues(valueText);
                const rawLabels = splitValues(labelText);
                const paired = pairValuesAndLabels(rawValues, rawLabels);
                if (paired.length > 0) return paired;
            }
        }
    }

    // Option 4: Primitive mapping check for display_value mapping
    if (fieldMapping && fieldMapping[fieldName]) {
        const mappingStr = fieldMapping[fieldName];
        if (typeof mappingStr === 'string') {
            const match = /\{response:([^}]+)\}/.exec(mappingStr);
            if (match) {
                const path = match[1];
                if (path.endsWith('.value')) {
                    const displayPath = path.substring(0, path.length - 6) + '.display_value';
                    const displayVal = getAtPath(rawInitialValues, displayPath);
                    if (displayVal !== undefined && displayVal !== null && displayVal !== '') {
                        const rawValues = splitValues(val);
                        const rawLabels = splitValues(displayVal);
                        const paired = pairValuesAndLabels(rawValues, rawLabels);
                        if (paired.length > 0) return paired;
                    }
                }
            }
        }
    }

    // Option 5: Default fallback (primitive string values)
    return values.map((v) => ({ label: v, value: v }));
}

function toFieldConfig(
    sf: SerializableFieldConfig,
    meta?: Record<string, unknown>,
    initialValues?: Record<string, unknown>,
    rawInitialValues?: Record<string, unknown>,
    fieldMapping?: Record<string, unknown>,
): FieldConfig {
    const sources: TemplateSources = { meta: meta ?? {}, initialValue: initialValues };
    const fc: FieldConfig = {
        name: sf.name,
        type: sf.type,
        label: sf.label ? resolveConversionTemplate(sf.label, sources) : sf.label,
        placeholder: sf.placeholder ? resolveConversionTemplate(sf.placeholder, sources) : sf.placeholder,
        required: sf.required,
        defaultValue: typeof sf.defaultValue === 'string' ? resolveConversionTemplate(sf.defaultValue, sources) : sf.defaultValue,
        disabled: sf.disabled,
        hidden: sf.hidden,
        colSpan: sf.colSpan,
        textAreaRows: sf?.textAreaRows,
    };

    if (sf.requiredWhen) {
        fc.requiredWhen = toFieldDependency(sf.requiredWhen, meta, initialValues);
    }

    if (sf.options) {
        fc.options = sf.options;
    } else if (sf.asyncOptions) {
        fc.asyncOptions = toAsyncOptions(sf.asyncOptions, meta);

        // Auto-inject fallback options from raw initial values
        if (initialValues && rawInitialValues) {
            const val = initialValues[sf.name];
            const fallbackOpts = getFallbackOptions(sf.name, val, rawInitialValues, fieldMapping, sf.asyncOptions, meta);
            if (fallbackOpts && fallbackOpts.length > 0) {
                fc.options = fallbackOpts;
            }
        }
    }

    // Static validation
    if (sf.validation) {
        fc.validation = toValidation(sf.validation);
    }

    // Conditional validation (separate field, runs alongside static)
    if (sf.conditionalValidation && sf.conditionalValidation.length > 0) {
        fc.conditionalValidation = toConditionalValidation(sf.conditionalValidation, meta, initialValues);
    }

    if (sf.asyncValidation) {
        fc.asyncValidation = toAsyncValidation(sf.asyncValidation);
    }

    if (sf.visibleWhen) {
        fc.visibleWhen = toFieldDependency(sf.visibleWhen, meta, initialValues);
    }

    if (sf.disabledWhen) {
        fc.disabledWhen = toFieldDependency(sf.disabledWhen, meta, initialValues);
    }

    if (sf.onChangeEffects && sf.onChangeEffects.length > 0) {
        fc.onChange = toOnChange(sf.name, sf.onChangeEffects, meta, initialValues);
    }

    return fc;
}

//  Request body mapping

/** Apply a mapping Record using the prefix template system.
 *
 *  Static value:   `{ "status": "active" }`                      -> literal "active"
 *  Template value: `{ "name": "{field:service_name}" }`          -> resolved from field source
 *  Multi-template: `{ "full": "{field:first} {field:last}" }`    -> combined from field source
 *  Dot-path:       `{ "city": "{response:address.city}" }`       -> resolved from response source
 *
 *  `consumePrefix` determines which prefix's keys are tracked as "consumed" - consumed
 *  source fields are removed from passthrough output (unmapped source fields pass through).
 *  e.g. bodyMapping consumes `field:` keys, fieldMapping consumes `response:` keys.
 */
function resolveBodyMapping(values: Record<string, unknown>, mapping: Record<string, unknown>, sources: TemplateSources): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [targetKey, val] of Object.entries(mapping)) {
        if (typeof val === 'string') {
            if (isTemplate(val)) {
                const fieldRefs = [...val.matchAll(/\{field:([^}]+)\}/g)].map((m) => m[1].split('.')[0]);
                const hasFieldRef = fieldRefs.length > 0;
                const referencedFieldInValues = fieldRefs.some((ref) => ref in values);
                if (!hasFieldRef || referencedFieldInValues) {
                    result[targetKey] = resolveTemplate(val, sources);
                }
            } else {
                result[targetKey] = val;
            }
        } else if (val && typeof val === 'object') {
            result[targetKey] = resolveBodyMapping(values, val as Record<string, unknown>, sources);
        } else {
            result[targetKey] = val;
        }
    }
    return result;
}

function mapRequestBody(values: Record<string, unknown>, bodyMapping: Record<string, unknown> | undefined, sources: TemplateSources): Record<string, unknown> {
    if (!bodyMapping) return values;
    return resolveBodyMapping(values, bodyMapping, sources);
}

function resolveMapping(mapping: Record<string, unknown>, sources: TemplateSources): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [targetKey, val] of Object.entries(mapping)) {
        if (typeof val === 'string') {
            if (isTemplate(val)) {
                result[targetKey] = resolveTemplate(val, sources);
            } else {
                result[targetKey] = val;
            }
        } else if (val && typeof val === 'object') {
            result[targetKey] = resolveMapping(val as Record<string, unknown>, sources);
        } else {
            result[targetKey] = val;
        }
    }
    return result;
}

//  Initial values mapping

function mapInitialValues(
    data: Record<string, unknown>,
    fieldMapping: Record<string, unknown> | undefined,
    sources: TemplateSources,
    formFieldNames?: Set<string>,
): Record<string, unknown> {
    if (!fieldMapping) {
        if (!formFieldNames) return data;
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            if (formFieldNames.has(key)) result[key] = value;
        }
        return result;
    }
    return resolveMapping(fieldMapping, sources);
}

//  Full form conversion

export interface ConvertOptions extends Partial<FormConfig> {
    /** QueryClient instance for invalidating queries after submit */
    queryClient?: QueryClient;
    /** Raw or pre-fetched initial values from the caller.
     *  If the record has `initialValuesConfig.fieldMapping`, the converter applies it
     *  automatically - so both raw API responses and pre-mapped values work here.
     *  Fetch externally via `fetchRawInitialValues()` or `fetchInitialValues()`. */
    initialValues?: Record<string, unknown>;
    /** Runtime meta object - a flat Record with contextual data (e.g. ticket details, record ID).
     *  Used to resolve `{meta:key}` templates in URLs, requestParams, and queryKey.
     *  Flows to all async options and initial values fetch calls. */
    meta?: Record<string, unknown>;
}

export function convertToRuntimeConfig(record: FormConfigRecord, overrides?: ConvertOptions): FormConfig {
    const { queryClient, meta: runtimeMeta, initialValues: rawInitialValues, ...rest } = overrides ?? {};
    const mode = rest.mode ?? record.mode ?? 'create';

    const meta = runtimeMeta ?? {};

    // Extract raw response from mapped initial values if it was fetched via fetchInitialValues
    const rawData =
        rawInitialValues && typeof rawInitialValues === 'object' && '_rawInitialValues' in rawInitialValues
            ? ((rawInitialValues as Record<string, unknown>)._rawInitialValues as Record<string, unknown>)
            : (rawInitialValues as Record<string, unknown>);

    // Apply fieldMapping to direct initial values when provided.
    // Only include fields that are defined in the form - prevents raw API objects
    // (e.g. SNOW { display_value, value }) from leaking into form state and submit payload.
    const formFieldNames = new Set(record.fields.map((f) => f.name));
    const fieldMappingSources: TemplateSources = { response: rawData, meta };
    const initialValues = rawInitialValues ? mapInitialValues(rawData, record.initialValuesConfig?.fieldMapping, fieldMappingSources, formFieldNames) : undefined;

    return {
        fields: record.fields.map((sf) => toFieldConfig(sf, meta, initialValues, rawData, record.initialValuesConfig?.fieldMapping)),
        mode,
        submitLabel: record.submitLabel,
        submittingLabel: record.submittingLabel,
        cancelLabel: record.cancelLabel,
        trackDirty: record.trackDirty,
        submitWithValues: record.submitWithValues,
        submitGuards: record.submitGuards,
        submitGuardMessages: record.submitGuardMessages,
        variant: rest.variant ?? record.variant,
        classNames: rest.classNames,
        initialValues,
        onSubmit: async (values) => {
            if (record.submitConfig) {
                const { url, method, bodyMapping, queryKeyToInvalidate, requestParams } = record.submitConfig;
                const m = meta ?? {};
                const httpMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
                const client = getApiClient(record.submitConfig.apiClient);
                const submitSources: TemplateSources = { meta: m, field: values, initialValue: initialValues };

                // Resolve URL path templates (supports {meta:key}, {field:key})
                let resolvedUrl = resolveUrlTemplate(url, m, submitSources);

                // Resolve query params templates and append to URL
                const resolvedQueryParams = requestParams?.queryParams ? resolveTemplateValues(requestParams.queryParams, m, submitSources) : {};
                resolvedUrl = appendQueryParams(resolvedUrl, resolvedQueryParams);

                // Map form values via bodyMapping - supports {field:key}, {meta:key} prefixes
                const body = mapRequestBody(values, bodyMapping, submitSources);

                const response = httpMethod === 'get' ? await client.get(resolvedUrl, { params: body }) : await client[httpMethod](resolvedUrl, body);

                // Invalidate React Query cache if configured (resolve {meta:key} templates)
                if (queryKeyToInvalidate && queryClient) {
                    const resolvedKeys = resolveQueryKey(queryKeyToInvalidate, m);
                    for (const key of resolvedKeys) {
                        await queryClient.invalidateQueries({ queryKey: [key] });
                    }
                }

                const data = response.data as Record<string, unknown>;
                return { message: (data?.message as string) ?? `Form "${record.name}" submitted successfully`, responseData: data };
            }
            return { message: `Form "${record.name}" submitted`, ...values };
        },
        ...rest,
    };
}

//  Fetch initial values from config
/** Returns the query key for caching the initial values fetch.
 *  Resolves `{meta:key}` templates in queryKey segments and URL. */
export function getInitialValuesQueryKey(record: FormConfigRecord, runtimeMeta?: Record<string, unknown>): string[] {
    const m = runtimeMeta ?? {};
    if (record.initialValuesConfig?.queryKey) {
        return resolveQueryKey(record.initialValuesConfig.queryKey, m);
    }
    const url = record.initialValuesConfig?.url;
    return ['initial-values', url ? resolveUrlTemplate(url, m) : record.id];
}

/** Fetch raw initial values from the configured URL WITHOUT applying fieldMapping.
 *  Useful when the caller needs the original API response structure
 *  (e.g. for fallback options that reference nested ServiceNow fields). */
export async function fetchRawInitialValues(record: FormConfigRecord, runtimeMeta?: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    if (!record.initialValuesConfig) return undefined;

    const { url, method, responsePath, requestParams, apiClient } = record.initialValuesConfig;
    const httpMethod = (method ?? 'GET').toLowerCase() as 'get' | 'post';
    const m = runtimeMeta ?? {};
    const client = getApiClient(apiClient);

    // Resolve URL path templates from meta
    let resolvedUrl = resolveUrlTemplate(url, m);

    // Resolve requestParams template values using meta, then append/use them
    const queryParams = requestParams?.queryParams ? resolveTemplateValues(requestParams.queryParams, m) : {};
    const bodyParams = requestParams?.bodyParams ? resolveTemplateValues(requestParams.bodyParams, m) : {};

    // Append query params
    resolvedUrl = appendQueryParams(resolvedUrl, queryParams);

    const response = httpMethod === 'post' ? await client.post(resolvedUrl, Object.keys(bodyParams).length > 0 ? bodyParams : undefined) : await client.get(resolvedUrl);

    let data = response.data as Record<string, unknown>;
    if (responsePath) {
        data = getAtPath(response.data, responsePath) as Record<string, unknown>;
    }

    return data ?? undefined;
}

/** Fetch initial values from the configured URL and apply fieldMapping.
 *  Returns flat form-ready values. */
export async function fetchInitialValues(record: FormConfigRecord, meta?: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const raw = await fetchRawInitialValues(record, meta);
    if (!raw) return undefined;
    const sources: TemplateSources = { response: raw, meta: meta ?? {} };
    const mapped = mapInitialValues(raw, record.initialValuesConfig?.fieldMapping, sources);
    if (mapped) {
        Object.defineProperty(mapped, '_rawInitialValues', {
            value: raw,
            writable: true,
            enumerable: false, // hidden from loops / JSON.stringify
            configurable: true,
        });
    }
    return mapped;
}
