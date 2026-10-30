/** Serializable (JSON-safe) form configuration types for DB storage.
 *  No functions - conditions use declarative operators. */

import type { FieldType, FormMode, FormSubmitGuardType, InputVariant, SelectOption, SubmitGuardMessages } from '@/shared/modules/dynamic-form/types';

//  Condition operators (replaces JS functions)
export type ConditionOperator = 'equals' | 'not_equals' | 'not_empty' | 'empty' | 'contains' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte';

export interface FieldCondition {
    field: string;
    operator: ConditionOperator;
    value?: unknown;
}

/** Multiple conditions joined by AND/OR */
export interface MultiFieldCondition {
    join: 'and' | 'or';
    conditions: FieldCondition[];
}

export type SerializableCondition = FieldCondition | MultiFieldCondition;

//  Validation (serializable)
export interface SerializableValidation {
    min?: number;
    minMessage?: string;
    max?: number;
    maxMessage?: string;
    minLength?: number;
    minLengthMessage?: string;
    maxLength?: number;
    maxLengthMessage?: string;
    /** Pattern as string, e.g. "^[a-z0-9-]+$" */
    pattern?: string;
    patternMessage?: string;
    // Date-specific validation (for date, datetime, date-range fields)
    /** ISO date string — field value must be on or after this date */
    minDate?: string;
    minDateMessage?: string;
    /** ISO date string — field value must be on or before this date */
    maxDate?: string;
    maxDateMessage?: string;
    /** Another form field whose value acts as the minimum date */
    minDateField?: string;
    minDateFieldMessage?: string;
    /** Another form field whose value acts as the maximum date */
    maxDateField?: string;
    maxDateFieldMessage?: string;
}

export interface SerializableConditionalValidation {
    when: SerializableCondition;
    rules: SerializableValidation;
}

//  onChange effects (serializable)
/** Declarative field update triggered when this field's value changes.
 *  Replaces code-driven `field.onChange = (v) => formApi.setFieldValue(...)`. */
export interface SerializableOnChangeEffect {
    /** Target field name to update */
    setField: string;
    /** Value to set on the target field. Supports `{field:key}` templates.
     *  - Static: `"Solved (Permanently)"` - literal value
     *  - Template: `"{field:urgency}"` - resolves from current form values
     *  - Empty string `""` - clears the target field */
    setValue: unknown;
    /** Optional condition - effect only fires when this condition is met.
     *  The condition is evaluated AFTER the triggering field's new value is applied.
     *  If omitted, the effect fires on every change (e.g. clearing a dependent field). */
    when?: SerializableCondition;
}

//  Async validation (serializable)
export interface SerializableAsyncValidation {
    /** URL to call for validation - value is sent as query param `value` */
    url: string;
    /** HTTP method (default GET) */
    method?: 'GET' | 'POST';
    /** Dot-path into the response to find the error message (if any) */
    errorPath?: string;
    /** Debounce in ms (default 500) */
    debounceMs?: number;
}

//  Request params (serializable)

/** Configurable request parameters for URL template resolution and param passing.
 *  All values support prefixed template syntax - `{meta:key}` resolved from the runtime `meta` object.
 *
 *  Example:
 *    URL: `/api/{meta:tenantId}/tickets/{meta:ticketId}`
 *    queryParams: `{ "assignee": "{meta:assignee}", "format": "json" }`
 *    meta: `{ tenantId: "acme", ticketId: "T-123", assignee: "john" }`
 *    -> GET `/api/acme/tickets/T-123?assignee=john&format=json`
 */
export interface SerializableRequestParams {
    /** Query parameters appended to the URL. Values support `{meta:key}` templates.
     *  Static: `{ "format": "json" }` -> always appended as-is
     *  Template: `{ "assignee": "{meta:assignee}" }` -> resolved from meta */
    queryParams?: Record<string, unknown>;
    /** Body parameters sent as JSON body (POST only). Values support `{meta:key}` templates.
     *  Static: `{ "fields": "all" }` -> always sent as-is
     *  Template: `{ "ticketId": "{meta:ticketId}" }` -> resolved from meta */
    bodyParams?: Record<string, unknown>;
}

//  API client selection

/** Selects which axios instance to use for API calls.
 *  - `'backend'` (default) - uses backendApiClient (e.g. maf.autonomousitopstoolkit.com)
 *  - `'service-now'` - uses serviceNowApiClient (e.g. cisicmpengineering1.service-now.com) */
export type ApiClientType = 'backend' | 'service-now';

//  Async options (serializable)
export interface SerializableAsyncOptions {
    /** URL to fetch options from. Supports `{meta:key}` path templates.
     *  For dependency field values in URLs, use `{field:fieldName}`. */
    url: string;
    /** HTTP method (default GET). POST sends dependency values as JSON body instead of query params. */
    method?: 'GET' | 'POST';
    /** Dot-path into the response to find the array, e.g. "data.results" */
    responsePath?: string;
    /** Key in each response item to use as option label.
     *  Use `{response:key}` to extract from response: `{response:name}` or `{response:company.name}`.
     *  Combine: `{response:firstName} {response:lastName}`. Without braces = static literal. */
    labelKey?: string;
    /** Key in each response item to use as option value.
     *  Use `{response:key}` to extract from response: `{response:id}` or `{response:sys_id}`.
     *  Without braces = static literal. */
    valueKey?: string;
    /** Field name(s) whose values trigger a refetch and are sent to the API */
    dependsOn?: string | string[];
    /** Debounce delay in ms before refetching when dependency values change (default: 300) */
    debounceMs?: number;
    /** Explicit React Query cache key segments. If provided, used instead of auto-generated key from URL.
     *  Supports `{meta:key}` template syntax - e.g. `["options", "{meta:tenantId}"]`. */
    queryKey?: string[];
    /** Request params: query params and body params for the fetch call.
     *  Values support `{meta:key}` templates resolved from the runtime meta object. */
    requestParams?: SerializableRequestParams;
    /** Which API client to use. Default: 'backend' */
    apiClient?: ApiClientType;
    /** When true, enables server-side search: the dropdown fetches options on open (empty search = limited results)
     *  and re-fetches with the search term as the user types. The search term is appended as a query param. */
    searchable?: boolean;
    /** Debounce delay in ms for search term changes (default: 300). Only used when `searchable` is true. */
    searchDebounceMs?: number;
    /** Query parameter key to append the search expression to (e.g. `sysparm_query`).
     *  When provided, the search expression is appended to the existing value of this query param
     *  using the appropriate separator. Default: `sysparm_query` for ServiceNow, `search` for backend. */
    searchQueryKey?: string;
    /** Query parameter template for server-side search. The `{searchTerm}` placeholder is replaced with the user's input.
     *  Also supports `{meta:key}`, `{field:key}`, and other template contracts.
     *  Default: `nameLIKE{searchTerm}`. Examples:
     *  - `nameLIKE{searchTerm}` — ServiceNow LIKE query
     *  - `user.nameLIKE{searchTerm}` — ServiceNow nested field query
     *  - `search={searchTerm}` — Generic search param */
    searchQueryParam?: string;
    /** Query separator for merging search term into query parameters (e.g. '^' for ServiceNow, default based on client) */
    searchQuerySeparator?: string;
    /** Template to resolve the initial selected option's label from raw initial values.
     *  E.g. `{response:cmdb_ci.display_value}` */
    initialOptionLabelKey?: string;
    /** Template to resolve the initial selected option's value from raw initial values.
     *  E.g. `{response:cmdb_ci.value}` */
    initialOptionValueKey?: string;
}

//  Meta field definition

/** Describes a single key expected in the runtime `meta` object.
 *  Used in the form builder UI to document the contract between
 *  the form config and the page code that provides meta. */
export interface MetaFieldDefinition {
    /** Key name in the meta object */
    key: string;
    /** Expected data type */
    type: 'string' | 'number' | 'boolean';
    /** Human-readable description of what this key represents */
    description?: string;
}

//  Submit config (serializable)
export interface SerializableSubmitConfig {
    /** API endpoint. Supports `{meta:key}` path templates. */
    url: string;
    /** HTTP method */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /** Map form values to request body keys. Use `{field:key}` for form values.
     *  - Static: `{ "status": "active" }` - adds literal value
     *  - Template: `{ "name": "{field:service_name}" }` - resolves from form value
     *  - Combine: `{ "fullName": "{field:first_name} {field:last_name}" }` */
    bodyMapping?: Record<string, unknown>;
    /** React Query key(s) to invalidate after submission. Supports `{meta:key}` templates. */
    queryKeyToInvalidate?: string[];
    /** Request params. Values support `{meta:key}` templates.
     *  Meta-resolved bodyParams are merged with form values - form values take priority. */
    requestParams?: SerializableRequestParams;
    /** Which API client to use. Default: 'backend' */
    apiClient?: ApiClientType;
}

// -- Initial values config (serializable)
export interface SerializableInitialValuesConfig {
    /** URL to fetch initial values from. Supports `{meta:key}` path templates. */
    url: string;
    /** HTTP method (default GET) */
    method?: 'GET' | 'POST';
    /** Dot-path into the response to find the values object, e.g. "data.record" */
    responsePath?: string;
    /** Map API response keys to form field names. Use `{response:key}` for API response fields.
     *  - Static: `{ "defaultRole": "user" }` - adds literal value
     *  - Template: `{ "access_level": "{response:accessLevel}" }` - resolves from API response
     *  - Combine: `{ "display_name": "{response:firstName} {response:lastName}" }` */
    fieldMapping?: Record<string, unknown>;
    /** React Query cache key segments. Supports `{meta:key}` templates. */
    queryKey?: string[];
    /** Request params. Values support `{meta:key}` templates. */
    requestParams?: SerializableRequestParams;
    /** Which API client to use. Default: 'backend' */
    apiClient?: ApiClientType;
}

//  Field config (serializable)
export interface SerializableFieldConfig {
    name: string;
    type: FieldType;
    order?: number;
    textAreaRows?: number;
    label: string;
    placeholder?: string;
    required?: boolean;
    /** Conditional required - field is required only when condition is met */
    requiredWhen?: SerializableCondition;
    defaultValue?: unknown;
    disabled?: boolean;
    /** When true, the field is hidden from the form */
    hidden?: boolean;
    colSpan?: 1 | 2;
    /** Static validation rules (always applied) */
    validation?: SerializableValidation;
    /** Conditional validation rules (applied when conditions match). Both static + conditional run together. */
    conditionalValidation?: SerializableConditionalValidation[];
    asyncValidation?: SerializableAsyncValidation;
    options?: SelectOption[];
    asyncOptions?: SerializableAsyncOptions;
    visibleWhen?: SerializableCondition;
    disabledWhen?: SerializableCondition;
    /** Declarative field updates triggered when this field's value changes.
     *  Each effect can optionally have a condition - if no condition, fires on every change. */
    onChangeEffects?: SerializableOnChangeEffect[];
}

//  Form config (serializable, DB entity)
export interface FormConfigRecord {
    id: string;
    /** Unique machine-readable code for looking up this form (e.g. "onboard-service", "create-incident").
     *  Used by `fetchFormConfigByCode()` to load a form without knowing its DB id. */
    code: string;
    name: string;
    description?: string;
    mode?: FormMode;
    fields: SerializableFieldConfig[];
    /** Custom submit button text (default: "Submit" or "Delete" for delete mode) */
    submitLabel?: string;
    /** Button text while submitting (default: "Submitting...") */
    submittingLabel?: string;
    /** Cancel button text (default: "Cancel"). Only rendered when `onCancel` is provided at runtime. */
    cancelLabel?: string;
    /** Track if form has unsaved changes */
    trackDirty?: boolean;
    /** What to send on submit: 'changed-only' sends only modified fields, 'all-values' sends everything.
     *  Default: 'changed-only' */
    submitWithValues?: 'changed-only' | 'all-values';
    /** Input field variant: 'standard' (label above), 'outlined' (floating label with border),
     *  'filled' (floating label with background). Default: 'standard' */
    variant?: InputVariant;
    /** Submit guards - controls which checks run before submission.
     *  `[]` = no guards. `undefined` = DynamicForm applies per-mode defaults. */
    submitGuards?: FormSubmitGuardType[];
    /** Custom messages for submit guard dialogs */
    submitGuardMessages?: SubmitGuardMessages;
    /** API submission configuration */
    submitConfig?: SerializableSubmitConfig;
    /** Configuration for fetching initial values (update/delete/view modes) */
    initialValuesConfig?: SerializableInitialValuesConfig;
    /** Describes the runtime `meta` object shape this form expects from the caller.
     *  Auto-extracted from `{meta:key}` templates in URLs, requestParams, and queryKey.
     *  Used in the form builder UI to document the contract. */
    metaFields?: MetaFieldDefinition[];
    created_by?: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
    formType?: 'servicenow' | 'standalone';
    version: number;
    snowDictName?: string;
}

export interface CreateFormConfigRequest {
    code: string;
    name: string;
    description?: string;
    mode?: FormMode;
    submitLabel?: string;
    submittingLabel?: string;
    cancelLabel?: string;
    trackDirty?: boolean;
    submitWithValues?: 'changed-only' | 'all-values';
    variant?: InputVariant;
    submitGuards?: FormSubmitGuardType[];
    submitGuardMessages?: SubmitGuardMessages;
    fields: SerializableFieldConfig[];
    submitConfig?: SerializableSubmitConfig;
    initialValuesConfig?: SerializableInitialValuesConfig;
    metaFields?: MetaFieldDefinition[];
    formType?: 'servicenow' | 'standalone';
    snowDictName?: string;
}

export interface UpdateFormConfigRequest {
    code?: string;
    name?: string;
    description?: string;
    mode?: FormMode;
    submitLabel?: string;
    submittingLabel?: string;
    cancelLabel?: string;
    trackDirty?: boolean;
    submitWithValues?: 'changed-only' | 'all-values';
    variant?: InputVariant;
    submitGuards?: FormSubmitGuardType[];
    submitGuardMessages?: SubmitGuardMessages;
    fields?: SerializableFieldConfig[];
    submitConfig?: SerializableSubmitConfig;
    initialValuesConfig?: SerializableInitialValuesConfig;
    metaFields?: MetaFieldDefinition[];
    formType?: 'servicenow' | 'standalone';
    snowDictName?: string;
}
