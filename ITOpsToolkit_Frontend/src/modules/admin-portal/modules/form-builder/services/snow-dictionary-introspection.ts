import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import type { SerializableFieldConfig, SerializableAsyncOptions } from '../types/form-config';
import type { FieldType } from '@/shared/modules/dynamic-form/types';

/** Raw row from sys_dictionary */
export interface SnowDictionaryRow {
    name: string;
    element: string;
    column_label: string;
    internal_type: string;
    mandatory: string;
    reference?: string;
    max_length?: string;
}

/** ServiceNow may return fields as objects `{ display_value, value }`, `{ link, value }`, or plain strings.
 *  This always extracts a plain string regardless of the shape. */
function toStr(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        if (typeof obj.display_value === 'string') return obj.display_value;
        if (typeof obj.value === 'string') return obj.value;
        if (typeof obj.display_value === 'number') return String(obj.display_value);
        if (typeof obj.value === 'number') return String(obj.value);
    }
    return '';
}

/**
 * Extract the raw `name=` value from a ServiceNow reference link URL.
 * e.g. `{ link: "https://...sys_glide_object?name=reference", value: "..." }` -> `"reference"`
 * e.g. `{ link: "https://...sys_db_object?name=sys_user", value: "..." }` -> `"sys_user"`
 * Falls back to display_value, then value if no link or no `?name=` match.
 */
function extractNameFromLink(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        // Try to extract from link URL: ?name=<value>
        if (typeof obj.link === 'string') {
            const match = /[?&]name=([^&]+)/.exec(obj.link);
            if (match) return match[1];
        }
        // Fallback to display_value or value
        if (typeof obj.display_value === 'string') return obj.display_value;
        if (typeof obj.value === 'string') return obj.value;
    }
    return '';
}

/** Normalise a raw sys_dictionary row so every field is a plain string.
 *  `internal_type` and `reference` extract the raw name from the link URL
 *  (e.g. `reference`, `integer`, `sys_user`) rather than display values
 *  (e.g. `Reference`, `Integer`, `User`). */
function normaliseRow(raw: Record<string, unknown>): SnowDictionaryRow {
    return {
        name: toStr(raw.name),
        element: toStr(raw.element),
        column_label: toStr(raw.column_label),
        internal_type: extractNameFromLink(raw.internal_type),
        mandatory: toStr(raw.mandatory),
        reference: extractNameFromLink(raw.reference) || undefined,
        max_length: toStr(raw.max_length) || undefined,
    };
}

/**
 * Walk the ServiceNow table hierarchy by following `sys_db_object.super_class`
 * until we reach a root table (empty super_class) or detect a cycle.
 *
 * Returns the full chain, e.g. `['incident', 'task']`.
 */
export async function getTableHierarchy(tableName: string): Promise<string[]> {
    const chain: string[] = [tableName];
    let current = tableName;

    while (true) {
        const res = await serviceNowApiClient.get('/api/now/table/sys_db_object', {
            params: {
                sysparm_query: `name=${current}`,
                sysparm_fields: 'super_class',
                sysparm_display_value: 'true',
            },
        });
        // With sysparm_display_value=true, super_class returns the table name as a plain string
        const superClass = toStr(res.data?.result?.[0]?.super_class);
        if (!superClass || chain.includes(superClass)) break;
        chain.push(superClass);
        current = superClass;
    }
    return chain;
}

/**
 * Fetch all dictionary fields across the full table hierarchy.
 * De-duplicates by element name, preferring the most-derived table's definition.
 */
export async function getDictionaryFields(tableName: string): Promise<SnowDictionaryRow[]> {
    const hierarchy = await getTableHierarchy(tableName);

    const res = await serviceNowApiClient.get('/api/now/table/sys_dictionary', {
        params: {
            sysparm_query: `nameIN${hierarchy.join(',')}^active=true^elementISNOTEMPTY`,
            sysparm_fields: 'name,element,column_label,internal_type,mandatory,reference,max_length',
            sysparm_limit: '1000',
        },
    });

    const rawRows: Record<string, unknown>[] = res.data?.result ?? [];
    const rows = rawRows.map(normaliseRow);

    // De-dupe by element - most-derived table wins (iterate parents first, then override with child)
    // Use case-insensitive matching since hierarchy names may come from display values (e.g. "Task" vs "task")
    const seen = new Map<string, SnowDictionaryRow>();
    for (const tableInChain of [...hierarchy].reverse()) {
        const tableNameLower = tableInChain.toLowerCase();
        for (const row of rows.filter((r) => r.name.toLowerCase() === tableNameLower)) {
            seen.set(row.element, row);
        }
    }
    return Array.from(seen.values()).sort((a, b) => a.element.localeCompare(b.element));
}

/**
 * Common ServiceNow integer fields that are actually choice-based (have entries in sys_choice).
 * These use `internal_type = 'integer'` in sys_dictionary but render as dropdowns in SNOW forms.
 */
const INTEGER_CHOICE_FIELDS = new Set([
    'state',
    'priority',
    'urgency',
    'impact',
    'severity',
    'risk',
    'contact_type',
    'notify',
    'order',
    'phase',
    'approval',
    'escalation',
    'category',
    'subcategory',
    'close_code',
]);

/** Map ServiceNow internal_type to DynamicForm FieldType.
 *  Uses case-insensitive matching since SNOW may return display values like "Reference" or raw names like "reference". */
function mapInternalType(internalType: string, _element: string): FieldType {
    switch (internalType.toLowerCase()) {
        case 'boolean':
            return 'checkbox';
        case 'integer':
            return 'text';
        // return INTEGER_CHOICE_FIELDS.has(element) ? 'select' : 'number';
        case 'decimal':
        case 'float':
            return 'number';
        case 'glide_date_time':
            return 'datetime';
        case 'glide_date':
        case 'due_date':
            return 'date';
        case 'choice':
        case 'reference':
            return 'select';
        case 'glide_list':
            return 'multiselect';
        case 'journal':
        case 'journal_input':
        case 'journal_list':
        case 'html':
        case 'multi_line_text':
        case 'user_input':
            return 'textarea';
        default:
            return 'text';
    }
}

/** Build a sys_choice asyncOptions config for choice/integer-choice fields */
function buildChoiceAsyncOptions(row: SnowDictionaryRow, tableName: string): SerializableAsyncOptions {
    return {
        url: '/api/now/table/sys_choice',
        apiClient: 'service-now',
        labelKey: '{response:label}',
        valueKey: '{response:value}',
        responsePath: 'result',
        requestParams: {
            queryParams: {
                sysparm_query: `name=${tableName}^element=${row.element}^inactive=false`,
                sysparm_fields: 'label,value,sys_id',
            },
        },
    };
}

/** Build asyncOptions config for reference, choice, or integer-choice fields */
function buildAsyncOptions(row: SnowDictionaryRow, tableName: string): SerializableAsyncOptions | undefined {
    const type = row.internal_type.toLowerCase();
    if ((type === 'reference' || type === 'glide_list') && row.reference) {
        return {
            url: `/api/now/table/${row.reference}`,
            apiClient: 'service-now',
            labelKey: '{response:name}',
            valueKey: '{response:sys_id}',
            responsePath: 'result',
            searchable: true,
            searchDebounceMs: 300,
            searchQueryKey: 'sysparm_query',
            searchQueryParam: 'active=true^nameLIKE{searchTerm}',
            initialOptionLabelKey: `{initialValue:${row.element}.display_value}`,
            initialOptionValueKey: `{initialValue:${row.element}.value}`,
            requestParams: {
                queryParams: { sysparm_limit: '20', sysparm_fields: 'sys_id,name' },
            },
        };
    }
    if (type === 'choice') {
        return buildChoiceAsyncOptions(row, tableName);
    }
    // Integer fields that are actually choice-based
    if (type === 'integer' && INTEGER_CHOICE_FIELDS.has(row.element)) {
        return buildChoiceAsyncOptions(row, tableName);
    }
    return undefined;
}

/**
 * Convert a dictionary row into a pre-configured SerializableFieldConfig.
 * This gives the user a good starting point that they can customise in the form builder.
 */
export function dictionaryRowToFieldConfig(row: SnowDictionaryRow, tableName: string): SerializableFieldConfig {
    const fieldType = mapInternalType(row.internal_type, row.element);
    const config: SerializableFieldConfig = {
        name: row.element,
        type: fieldType,
        label: row.column_label || row.element,
        required: row.mandatory === 'true',
        colSpan: fieldType === 'textarea' ? 2 : 1,
        textAreaRows: fieldType === 'textarea' ? 5 : undefined,
    };

    if ((fieldType === 'text' || fieldType === 'textarea') && row.max_length) {
        const maxLen = Number(row.max_length);
        if (maxLen > 0 && maxLen < 100000) {
            config.validation = { maxLength: maxLen };
        }
    }

    const asyncOpts = buildAsyncOptions(row, tableName);
    if (asyncOpts) {
        config.asyncOptions = asyncOpts;
    }

    return config;
}
