import type { FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import type { InputVariant } from '@/shared/components/ui/InputFields';
import type { FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';

export type FieldType = 'text' | 'textarea' | 'password' | 'select' | 'multiselect' | 'number' | 'checkbox' | 'date' | 'datetime' | 'date-range' | 'number-range';
export type FormMode = 'create' | 'update' | 'delete' | 'view';
export type { InputVariant };

export interface SelectOption {
    label: string;
    value: string;
}

export interface FieldValidation {
    min?: number;
    minMessage?: string;
    max?: number;
    maxMessage?: string;
    minLength?: number;
    minLengthMessage?: string;
    maxLength?: number;
    maxLengthMessage?: string;
    pattern?: RegExp;
    patternMessage?: string;
    // Date-specific validation (for date, datetime, date-range fields)
    minDate?: string;
    minDateMessage?: string;
    maxDate?: string;
    maxDateMessage?: string;
    /** Another form field whose value acts as the minimum date */
    minDateField?: string;
    minDateFieldMessage?: string;
    /** Another form field whose value acts as the maximum date */
    maxDateField?: string;
    maxDateFieldMessage?: string;
    custom?: (value: unknown, allValues: Record<string, unknown>) => string | undefined;
}

/** Validation rules that only apply when a dependency condition is met */
export interface ConditionalValidation {
    when: FieldDependency;
    rules: FieldValidation;
}

export interface AsyncFieldValidation {
    validate: (value: unknown, allValues: Record<string, unknown>) => Promise<string | undefined>;
    debounceMs?: number;
}

/** Single-field dependency: condition receives the dep field's value + allValues */
interface SingleFieldDependency {
    field: string;
    condition: (value: unknown, allValues: Record<string, unknown>) => boolean;
}

/** Multi-field dependency: condition receives allValues only */
interface MultiFieldDependency {
    fields: string[];
    condition: (allValues: Record<string, unknown>) => boolean;
}

export type FieldDependency = SingleFieldDependency | MultiFieldDependency;

export interface AsyncOptionsConfig {
    /** Explicit query key for caching. Required when using queryFn; auto-generated from url if omitted. */
    queryKey?: (dependencyValue?: unknown) => unknown[];
    /** Custom fetch function that returns options directly (must return SelectOption[]).
     *  When `searchable` is true, receives a second `searchTerm` argument. */
    queryFn?: (dependencyValue?: unknown, searchTerm?: string) => Promise<SelectOption[]>;
    /** URL to fetch options from. Used when queryFn is not provided. */
    url?: string | ((dependencyValue?: unknown) => string);
    /** Map the raw API response to SelectOption[]. Required when the response isn't already SelectOption[]. */
    mapResponse?: (data: unknown) => SelectOption[];
    /** Single field name or array of field names whose values trigger a refetch */
    dependsOn?: string | string[];
    /** Debounce delay in ms before refetching when dependency values change (default: 300) */
    debounceMs?: number;
    /** When true, enables server-side search: the select/multiselect dropdown fetches options
     *  on open (empty search = limited results) and re-fetches with the search term as the user types.
     *  For `queryFn`: search term is passed as an additional argument after dependencyValue.
     *  For `url`: search term is appended as a query param. */
    searchable?: boolean;
    /** Debounce delay in ms for search term changes (default: 300). Only used when `searchable` is true. */
    searchDebounceMs?: number;
    /** Which API client to use: 'backend' or 'service-now' (default: 'backend') */
    apiClient?: 'backend' | 'service-now';
    /** Query parameter key to append the search expression to (e.g. `sysparm_query`).
     *  Default: `sysparm_query` for ServiceNow, `search` for backend. */
    searchQueryKey?: string;
    /** Query parameter template for server-side search. The `{searchTerm}` placeholder is replaced with the user's input. */
    searchQueryParam?: string;
    /** Query separator for merging search term into query parameters (e.g. '^' for ServiceNow, default based on client) */
    searchQuerySeparator?: string;
}

export interface FieldConfig {
    name: string;
    type: FieldType;
    order?: number;
    textAreaRows?: number;
    /** Display label. Supports `{field:key}` templates - resolved reactively at render time from current form values.
     *  Config-based forms also support `{meta:key}` and `{initialValue:key}` (resolved at conversion time). */
    label: string;
    /** Placeholder text. Same template support as `label`. */
    placeholder?: string;
    required?: boolean;
    /** Conditional required - field is required only when dependency condition is met */
    requiredWhen?: FieldDependency;
    defaultValue?: unknown;
    disabled?: boolean;
    /** When true, the field is hidden from the form */
    hidden?: boolean;
    colSpan?: 1 | 2;
    /** Static validation rules (always applied) */
    validation?: FieldValidation;
    /** Conditional validation rules (applied when their conditions match). Both static + conditional run together. */
    conditionalValidation?: ConditionalValidation[];
    asyncValidation?: AsyncFieldValidation;
    options?: SelectOption[];
    asyncOptions?: AsyncOptionsConfig;
    visibleWhen?: FieldDependency;
    disabledWhen?: FieldDependency;
    onChange?: (value: unknown, formApi: unknown) => void;
}

/** Submit guard types - checked before form submission.
 *  - `'no-changes'`: Warns if no fields changed (update mode only by default)
 *  - `'confirm-before-submit'`: Shows confirmation dialog before submitting */
export type FormSubmitGuardType = FormSubmitGuard;

/** Configurable messages for submit guards.
 *  Override the default dialog titles, messages, and button labels shown by each guard. */
export interface SubmitGuardMessages {
    /** Title shown when 'no-changes' guard fires. Default: "Nothing's changed" */
    noChangesTitle?: string;
    /** Message shown when 'no-changes' guard fires. Default: "No changes detected. Please modify the form before submitting." */
    noChangesMessage?: string;
    /** Title shown when 'confirm-before-submit' guard fires. Default: "Are you sure?" */
    confirmTitle?: string;
    /** Message shown when 'confirm-before-submit' guard fires. Default: "Do you really want to submit the form with the current changes?" */
    confirmMessage?: string;
    /** Label for the proceed/submit button in the confirm dialog. Default: "Proceed" */
    confirmProceedLabel?: string;
    /** Label for the cancel/discard button in the confirm dialog. Default: "Discard" */
    confirmDiscardLabel?: string;
}

export interface FormConfig<TMode extends FormMode = FormMode> {
    fields: FieldConfig[];
    mode: TMode;
    submitLabel?: string;
    submittingLabel?: string;
    onSubmit: (values: Record<string, unknown>) => Promise<{ message?: string; responseData?: Record<string, unknown> }>;
    onSubmitSuccess?: (values: Record<string, unknown>, message: string, responseData?: Record<string, unknown>) => Promise<void>;
    /** Called when the cancel button is clicked. If not provided, no cancel button is rendered. */
    onCancel?: () => void | Promise<void>;
    /** Called after onCancel completes successfully. */
    onCancelSuccess?: () => void | Promise<void>;
    /** Cancel button text. Default: "Cancel" */
    cancelLabel?: string;
    initialValues?: Record<string, unknown>;
    isFieldDisabled?: (info: FieldDisableInfo<TMode>) => boolean | undefined;
    trackDirty?: boolean;
    /** What to send on submit: 'changed-only' sends only modified fields, 'all-values' sends everything.
     *  Default: 'changed-only' */
    submitWithValues?: 'changed-only' | 'all-values';
    onDirtyChange?: (isDirty: boolean) => void;
    /** Input field variant: 'standard' (label above), 'outlined' (floating label with border),
     *  'filled' (floating label with background). Default: 'standard' */
    variant?: InputVariant;
    /** Override default class names for form layout and field styling */
    classNames?: FormClassNames;
    /** Submit guards - controls which checks run before submission.
     *  Default: `['confirm-before-submit']` for create/delete, `['no-changes', 'confirm-before-submit']` for update.
     *  Set to `[]` to disable all submit guards. */
    submitGuards?: FormSubmitGuardType[];
    /** Custom messages for submit guard dialogs. Override titles, messages, and button labels. */
    submitGuardMessages?: SubmitGuardMessages;
}

/** Customisable class names for DynamicForm layout and field styling.
 *  Every key is optional - only the slots you provide are overridden (merged via twMerge). */
export interface FormClassNames {
    //  Layout
    /** Outer `<form>` element */
    form?: string;
    /** Grid container that holds all fields */
    fieldGrid?: string;
    /** Wrapper `<div>` around each field (receives colSpan) */
    fieldWrapper?: string;
    /** Footer bar containing the submit button */
    submitFooter?: string;
    /** Submit button itself */
    submitButton?: string;
    /** Cancel button (only rendered when onCancel is provided) */
    cancelButton?: string;

    //  Field label & error
    /** Field label text */
    label?: string;
    /** Error message text below fields */
    error?: string;
    /** FormField border wrapper - outlined/filled variants only (fieldset border) */
    fieldset?: string;

    //  Input elements
    /** Input elements: text, number, password (merged with variant inputClassName) */
    input?: string;
    /** Textarea element for multiline text fields */
    textarea?: string;

    //  Select & multi-select -
    /** Select/multiselect/date trigger button */
    selectTrigger?: string;
    /** Multi-select chip elements */
    chip?: string;
    /** Multi-select chip delete icon */
    chipDelete?: string;

    //  Checkbox
    /** Checkbox input element */
    checkboxInput?: string;
    /** Checkbox label wrapper */
    checkboxLabel?: string;
}

export interface FormImperativeHandle {
    setFieldValue: (field: string, value: unknown) => void;
    getFieldValue: (field: string) => unknown;
    resetField: (field: string) => void;
    resetForm: () => void;
    submitForm: () => void;
}

export interface BaseFieldProps {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    name: string;
    /** Extra className for the input element (e.g. border-0 for outlined/filled variants) */
    inputClassName?: string;
}
