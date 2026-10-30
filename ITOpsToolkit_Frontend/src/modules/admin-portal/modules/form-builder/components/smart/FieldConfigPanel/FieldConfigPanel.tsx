import React, { useCallback, useState } from 'react';
import { TextInput, NumberInput, CheckboxInput, SelectInput, DateInput } from '@/shared/components/ui/InputFields';
import type {
    FieldCondition,
    MultiFieldCondition,
    SerializableFieldConfig,
    SerializableValidation,
    SerializableAsyncOptions,
    SerializableCondition,
    SerializableConditionalValidation,
    SerializableOnChangeEffect,
    ConditionOperator,
} from '../../../types/form-config';
import type { FieldType } from '@/shared/modules/dynamic-form/types';
import { X, Plus, ChevronRight } from 'lucide-react';
import { Label, TemplateInput, TemplateKeyInput, TemplateCSVInput, JsonInput } from '../../shared/form-builder-inputs';

const FIELD_TYPE_OPTIONS = [
    { label: 'Text', value: 'text' },
    { label: 'Password', value: 'password' },
    { label: 'Textarea', value: 'textarea' },
    { label: 'Number', value: 'number' },
    { label: 'Select', value: 'select' },
    { label: 'Multi Select', value: 'multiselect' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Date', value: 'date' },
    { label: 'DateTime', value: 'datetime' },
    { label: 'Date Range', value: 'date-range' },
    { label: 'Number Range', value: 'number-range' },
];

const COL_SPAN_OPTIONS = [
    { label: '1 Column', value: '1' },
    { label: '2 Columns (Full Width)', value: '2' },
];

const OPERATOR_OPTIONS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'not_equals' },
    { label: 'Not Empty', value: 'not_empty' },
    { label: 'Empty', value: 'empty' },
    { label: 'Contains', value: 'contains' },
    { label: 'In (any of)', value: 'in' },
    { label: 'Not In', value: 'not_in' },
    { label: 'Greater Than', value: 'gt' },
    { label: 'Less Than', value: 'lt' },
    { label: 'Greater or Equal', value: 'gte' },
    { label: 'Less or Equal', value: 'lte' },
];

interface FieldConfigPanelProps {
    field: SerializableFieldConfig;
    allFieldNames: string[];
    onChange: (updated: SerializableFieldConfig) => void;
    onClose: () => void;
    /** Report JSON input error state so the parent can disable save */
    onJsonError?: (key: string, hasError: boolean) => void;
    isServiceNowForm?: boolean;
}

const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({ field, allFieldNames, onChange, onClose, onJsonError, isServiceNowForm }) => {
    const update = useCallback(
        <K extends keyof SerializableFieldConfig>(key: K, value: SerializableFieldConfig[K]) => {
            onChange({ ...field, [key]: value });
        },
        [field, onChange],
    );

    //  Static validation helpers
    const staticValidation = (field.validation ?? {}) as SerializableValidation;

    const updateStaticValidation = useCallback(
        <K extends keyof SerializableValidation>(key: K, value: SerializableValidation[K]) => {
            const current = (field.validation ?? {}) as SerializableValidation;
            const updated = { ...current, [key]: value };
            if (value === undefined || value === null || value === '') {
                delete (updated as Record<string, unknown>)[key];
            }
            onChange({ ...field, validation: Object.keys(updated).length > 0 ? updated : undefined });
        },
        [field, onChange],
    );

    //  Conditional validation helpers

    const conditionalValidations = (field.conditionalValidation ?? []) as SerializableConditionalValidation[];

    const addConditionalValidation = useCallback(() => {
        const newRule: SerializableConditionalValidation = {
            when: { field: '', operator: 'not_empty' },
            rules: {},
        };
        onChange({ ...field, conditionalValidation: [...conditionalValidations, newRule] });
    }, [field, onChange, conditionalValidations]);

    const updateConditionalValidation = useCallback(
        (index: number, updated: SerializableConditionalValidation) => {
            const items = [...conditionalValidations];
            items[index] = updated;
            onChange({ ...field, conditionalValidation: items });
        },
        [field, onChange, conditionalValidations],
    );

    const removeConditionalValidation = useCallback(
        (index: number) => {
            const updated = conditionalValidations.filter((_, i) => i !== index);
            onChange({ ...field, conditionalValidation: updated.length > 0 ? updated : undefined });
        },
        [field, onChange, conditionalValidations],
    );

    //  onChange effects helpers

    const onChangeEffects = (field.onChangeEffects ?? []) as SerializableOnChangeEffect[];

    const addOnChangeEffect = useCallback(() => {
        const newEffect: SerializableOnChangeEffect = { setField: '', setValue: '' };
        onChange({ ...field, onChangeEffects: [...onChangeEffects, newEffect] });
    }, [field, onChange, onChangeEffects]);

    const updateOnChangeEffect = useCallback(
        (index: number, updated: SerializableOnChangeEffect) => {
            const items = [...onChangeEffects];
            items[index] = updated;
            onChange({ ...field, onChangeEffects: items });
        },
        [field, onChange, onChangeEffects],
    );

    const removeOnChangeEffect = useCallback(
        (index: number) => {
            const updated = onChangeEffects.filter((_, i) => i !== index);
            onChange({ ...field, onChangeEffects: updated.length > 0 ? updated : undefined });
        },
        [field, onChange, onChangeEffects],
    );

    //  Async options helpers

    const asyncOpts = field.asyncOptions;

    const updateAsyncOptions = useCallback(
        <K extends keyof SerializableAsyncOptions>(key: K, value: SerializableAsyncOptions[K]) => {
            const current = field.asyncOptions ?? ({ url: '' } as SerializableAsyncOptions);
            onChange({ ...field, asyncOptions: { ...current, [key]: value } });
        },
        [field, onChange],
    );

    //  Derived state

    const hasOptions = field.type === 'select' || field.type === 'multiselect';
    const isStringType = ['text', 'password', 'textarea', 'select'].includes(field.type);
    const isNumberType = field.type === 'number' || field.type === 'number-range';
    const isMultiSelectType = field.type === 'multiselect';
    const isCheckboxType = field.type === 'checkbox';
    const isDateType = ['date', 'datetime', 'date-range'].includes(field.type);
    const isTextAreaField = field.type === 'textarea';
    const otherFieldOptions = allFieldNames.filter((n) => n !== field.name).map((n) => ({ label: n, value: n }));

    // Section collapse state
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
        requiredWhen: true,
        staticOptions: true,
        asyncOptions: true,
        staticValidation: true,
        conditionalValidation: true,
        visibleWhen: true,
        disabledWhen: true,
        onChangeEffects: true,
    });
    const toggle = useCallback((key: string) => {
        setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);
    const expand = useCallback((key: string) => {
        setCollapsed((prev) => ({ ...prev, [key]: false }));
    }, []);

    const sectionHeader = (key: string, label: string, extra?: React.ReactNode) => (
        <div className="w-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <button type="button" onClick={() => toggle(key)} className="flex items-center gap-1.5 hover:text-gray-600 transition-colors">
                <ChevronRight size={11} className={`shrink-0 transition-transform ${collapsed[key] ? '' : 'rotate-90'}`} />
                <span>{label}</span>
            </button>
            {extra}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-700">Field Settings</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <Label text="Name" required>
                    <TextInput value={field.name} onChange={(v) => update('name', v)} placeholder="field_name" disabled={isServiceNowForm} />
                </Label>

                <Label text="Label" required>
                    <TextInput value={field.label} onChange={(v) => update('label', v)} placeholder="Field Label" />
                </Label>

                <Label text="Type" required>
                    <SelectInput value={field.type} onChange={(v) => update('type', v as FieldType)} options={FIELD_TYPE_OPTIONS} placeholder="Select type..." />
                </Label>

                <Label text="Placeholder">
                    <TextInput value={field.placeholder ?? ''} onChange={(v) => update('placeholder', v || undefined)} placeholder="Placeholder text..." />
                </Label>

                <Label text="Column Span">
                    <SelectInput value={String(field.colSpan ?? 1)} onChange={(v) => update('colSpan', Number(v) as 1 | 2)} options={COL_SPAN_OPTIONS} />
                </Label>

                {isTextAreaField ? (
                    <Label text="Text Area Rows">
                        <NumberInput value={field.textAreaRows} max={200} min={1} onChange={(v) => update('textAreaRows', v)} placeholder="Text Area rows..." />
                    </Label>
                ) : null}

                <Label text="Default Value">
                    <TextInput
                        value={field.defaultValue !== undefined && field.defaultValue !== null ? String(field.defaultValue) : ''}
                        onChange={(v) => {
                            if (!v.trim()) {
                                update('defaultValue', undefined);
                                return;
                            }
                            // Auto-detect type: number, boolean, or string
                            if (v === 'true') update('defaultValue', true);
                            else if (v === 'false') update('defaultValue', false);
                            else if (!isNaN(Number(v)) && v.trim() !== '') update('defaultValue', Number(v));
                            else update('defaultValue', v);
                        }}
                        placeholder="Default value (auto-detects type)"
                    />
                </Label>

                <div className="flex gap-4 flex-wrap">
                    <CheckboxInput label="Required" checked={!!field.required} onChange={(v) => update('required', v || undefined)} />
                    <CheckboxInput label="Disabled" checked={!!field.disabled} onChange={(v) => update('disabled', v || undefined)} />
                </div>

                {/*  Required When  */}
                <div className="space-y-2">
                    {sectionHeader(
                        'requiredWhen',
                        'Required When',
                        !collapsed.requiredWhen && !field.requiredWhen ? (
                            <button
                                type="button"
                                className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
                                onClick={() => {
                                    onChange({ ...field, requiredWhen: { field: '', operator: 'not_empty' } });
                                    expand('requiredWhen');
                                }}
                            >
                                + Add
                            </button>
                        ) : undefined,
                    )}
                    {!collapsed.requiredWhen && field.requiredWhen && (
                        <ConditionEditor
                            condition={field.requiredWhen}
                            fieldOptions={otherFieldOptions}
                            onChange={(c) => update('requiredWhen', c)}
                            onRemove={() => update('requiredWhen', undefined)}
                        />
                    )}
                </div>

                {/*  Static Options  */}
                {hasOptions && (
                    <div className="space-y-2">
                        {sectionHeader('staticOptions', 'Static Options')}
                        {!collapsed.staticOptions && <OptionsEditor options={field.options ?? []} onChange={(opts) => update('options', opts.length > 0 ? opts : undefined)} />}
                    </div>
                )}

                {/*  Async Options  */}
                {hasOptions && (
                    <div className="space-y-2">
                        {sectionHeader(
                            'asyncOptions',
                            'Async Options (URL)',
                            !collapsed.asyncOptions && !asyncOpts ? (
                                <button
                                    type="button"
                                    className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
                                    onClick={() => {
                                        onChange({ ...field, asyncOptions: { url: '' } });
                                        expand('asyncOptions');
                                    }}
                                >
                                    + Add
                                </button>
                            ) : undefined,
                        )}
                        {!collapsed.asyncOptions && asyncOpts && (
                            <div className="space-y-2 pl-2 border-l-2 border-blue-100">
                                <div className="grid grid-cols-2 gap-2">
                                    <Label text="URL" required>
                                        <TemplateInput value={asyncOpts.url} onChange={(v) => updateAsyncOptions('url', v)} placeholder="/api/{meta:tenantId}/options" />
                                    </Label>
                                    <Label text="Method">
                                        <SelectInput
                                            value={asyncOpts.method ?? 'GET'}
                                            onChange={(v) => updateAsyncOptions('method', v as 'GET' | 'POST')}
                                            options={[
                                                { label: 'GET', value: 'GET' },
                                                { label: 'POST', value: 'POST' },
                                            ]}
                                        />
                                    </Label>
                                </div>
                                <Label text="API Client">
                                    <SelectInput
                                        value={asyncOpts.apiClient ?? 'backend'}
                                        onChange={(v) => updateAsyncOptions('apiClient', v as 'backend' | 'service-now')}
                                        options={[
                                            { label: 'Backend', value: 'backend' },
                                            { label: 'ServiceNow', value: 'service-now' },
                                        ]}
                                    />
                                </Label>
                                <Label text="Response Path">
                                    <TextInput
                                        value={asyncOpts.responsePath ?? ''}
                                        onChange={(v) => updateAsyncOptions('responsePath', v || undefined)}
                                        placeholder="data.results"
                                    />
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Label text="Label Key">
                                        <TemplateKeyInput
                                            value={asyncOpts.labelKey ?? ''}
                                            onChange={(v) => updateAsyncOptions('labelKey', v || undefined)}
                                            placeholder="{response:name}"
                                        />
                                    </Label>
                                    <Label text="Value Key">
                                        <TemplateKeyInput
                                            value={asyncOpts.valueKey ?? ''}
                                            onChange={(v) => updateAsyncOptions('valueKey', v || undefined)}
                                            placeholder="{response:id}"
                                        />
                                    </Label>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Label text="Initial Option Label Template">
                                        <TemplateKeyInput
                                            value={asyncOpts.initialOptionLabelKey ?? ''}
                                            onChange={(v) => updateAsyncOptions('initialOptionLabelKey', v || undefined)}
                                            placeholder="{initialValue:cmdb_ci.display_value}"
                                        />
                                    </Label>
                                    <Label text="Initial Option Value Template">
                                        <TemplateKeyInput
                                            value={asyncOpts.initialOptionValueKey ?? ''}
                                            onChange={(v) => updateAsyncOptions('initialOptionValueKey', v || undefined)}
                                            placeholder="{initialValue:cmdb_ci.value}"
                                        />
                                    </Label>
                                </div>
                                <p className="text-[9px] text-gray-400">
                                    Use <code>{'{response:key}'}</code> to extract from API response. Dot-path: <code>{'{response:company.name}'}</code>. Combine:{' '}
                                    <code>{'{response:first} {response:last}'}</code>
                                </p>
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                    <strong>Initial Option templates</strong> use <code>{'{initialValue:key}'}</code> to resolve from the record&apos;s initial values (not the
                                    options API). E.g. <code>{'{initialValue:cmdb_ci.display_value}'}</code> extracts the selected option label as a fallback.
                                </p>
                                <Label text="Depends On">
                                    <TemplateCSVInput
                                        value={typeof asyncOpts.dependsOn === 'string' ? asyncOpts.dependsOn : (asyncOpts.dependsOn?.join(', ') ?? '')}
                                        onChange={(v) => {
                                            const trimmed = v.trim();
                                            if (!trimmed) updateAsyncOptions('dependsOn', undefined);
                                            else if (trimmed.includes(','))
                                                updateAsyncOptions(
                                                    'dependsOn',
                                                    trimmed
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                );
                                            else updateAsyncOptions('dependsOn', trimmed);
                                        }}
                                        placeholder="field_name or field1, field2"
                                    />
                                </Label>
                                <Label text="Debounce (ms)">
                                    <NumberInput
                                        value={asyncOpts.debounceMs ?? ''}
                                        onChange={(v) => updateAsyncOptions('debounceMs', v ? Number(v) : undefined)}
                                        placeholder="300"
                                        min={0}
                                        max={5000}
                                    />
                                    <p className="text-[9px] text-gray-400 mt-0.5">Delay before refetching when dependency values change (default: 300ms)</p>
                                </Label>
                                <Label text="Query Key (comma-separated)">
                                    <TemplateCSVInput
                                        value={asyncOpts.queryKey?.join(', ') ?? ''}
                                        onChange={(v) => {
                                            const keys = v
                                                .split(',')
                                                .map((s) => s.trim())
                                                .filter(Boolean);
                                            updateAsyncOptions('queryKey', keys.length > 0 ? keys : undefined);
                                        }}
                                        placeholder="my-options, services-{meta:tenantId}"
                                    />
                                    <p className="text-[9px] text-gray-400 mt-0.5">Custom React Query cache key. If empty, auto-generated from URL.</p>
                                </Label>
                                <p className="text-[9px] text-gray-400">
                                    URL supports <code>{'{meta:key}'}</code> and <code>{'{field:key}'}</code> path templates. e.g.{' '}
                                    <code>
                                        /api/{'{meta:tenantId}'}/options/{'{field:category}'}
                                    </code>
                                </p>
                                <Label text="Query Params (JSON)">
                                    <JsonInput
                                        value={asyncOpts.requestParams?.queryParams}
                                        onChange={(v) => updateAsyncOptions('requestParams', { ...asyncOpts.requestParams, queryParams: v })}
                                        onError={(e) => onJsonError?.(`${field.name}-ao-queryParams`, e)}
                                        placeholder='{"format": "short", "assignee": "{meta:assignee}"}'
                                    />
                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                        Static values or <code>{'{meta:key}'}</code>, <code>{'{field:key}'}</code> templates
                                    </p>
                                </Label>
                                {(asyncOpts.method ?? 'GET') === 'POST' && (
                                    <Label text="Body Params (JSON)">
                                        <JsonInput
                                            value={asyncOpts.requestParams?.bodyParams}
                                            onChange={(v) => updateAsyncOptions('requestParams', { ...asyncOpts.requestParams, bodyParams: v })}
                                            onError={(e) => onJsonError?.(`${field.name}-ao-bodyParams`, e)}
                                            placeholder='{"ticketId": "{meta:ticketId}", "fields": "all"}'
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Static values or <code>{'{meta:key}'}</code>, <code>{'{field:key}'}</code> templates. Sent as JSON body for POST requests.
                                        </p>
                                    </Label>
                                )}
                                <p className="text-[9px] text-gray-400">
                                    {(asyncOpts.method ?? 'GET') === 'GET'
                                        ? 'GET: dependency values sent as query params (?category=eng&region=us-east)'
                                        : 'POST: dependency values sent as JSON body ({ "category": "eng" })'}
                                </p>
                                <div className="flex gap-4 flex-wrap pt-1">
                                    <CheckboxInput
                                        label="Enable Server-Side Search"
                                        checked={!!asyncOpts.searchable}
                                        onChange={(v) => {
                                            updateAsyncOptions('searchable', v || undefined);
                                            if (!v) {
                                                updateAsyncOptions('searchDebounceMs', undefined);
                                                updateAsyncOptions('searchQueryKey', undefined);
                                                updateAsyncOptions('searchQueryParam', undefined);
                                                updateAsyncOptions('searchQuerySeparator', undefined);
                                            }
                                        }}
                                    />
                                </div>
                                {asyncOpts.searchable && (
                                    <div className="space-y-2 pl-2 border-l-2 border-blue-100 mt-2">
                                        <Label text="Search Debounce (ms)">
                                            <NumberInput
                                                value={asyncOpts.searchDebounceMs ?? ''}
                                                onChange={(v) => updateAsyncOptions('searchDebounceMs', v ? Number(v) : undefined)}
                                                placeholder="300"
                                                min={0}
                                                max={5000}
                                            />
                                        </Label>
                                        <Label text="Search Query Key">
                                            <TextInput
                                                value={asyncOpts.searchQueryKey ?? ''}
                                                onChange={(v) => updateAsyncOptions('searchQueryKey', v || undefined)}
                                                placeholder={asyncOpts.apiClient === 'service-now' ? 'sysparm_query' : 'search'}
                                            />
                                            <p className="text-[9px] text-gray-400 mt-0.5">
                                                The query parameter name to append the search expression to. Default: <code>sysparm_query</code> (ServiceNow) or <code>search</code>{' '}
                                                (backend).
                                            </p>
                                        </Label>
                                        <Label text="Search Query Parameter Template">
                                            <TemplateKeyInput
                                                value={asyncOpts.searchQueryParam ?? ''}
                                                onChange={(v) => updateAsyncOptions('searchQueryParam', v || undefined)}
                                                placeholder={asyncOpts.apiClient === 'service-now' ? 'nameLIKE{searchTerm}' : '{searchTerm}'}
                                            />
                                            <p className="text-[9px] text-gray-400 mt-0.5">
                                                Search expression template appended to the query key. <code>{'{searchTerm}'}</code> is replaced with the user&apos;s input. Also
                                                supports <code>{'{meta:key}'}</code>, <code>{'{field:key}'}</code>, and other template contracts.
                                            </p>
                                        </Label>
                                    </div>
                                )}
                                <button type="button" className="text-[10px] text-red-500 hover:text-red-700" onClick={() => onChange({ ...field, asyncOptions: undefined })}>
                                    Remove Async Options
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/*  Static Validation  */}
                <div className="space-y-2">
                    {sectionHeader('staticValidation', 'Static Validation')}
                    {!collapsed.staticValidation && (
                        <div className="space-y-2 pl-2 border-l-2 border-blue-100">
                            {isStringType && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Length">
                                            <NumberInput value={staticValidation.minLength} onChange={(v) => updateStaticValidation('minLength', v)} placeholder="0" />
                                        </Label>
                                        <Label text="Max Length">
                                            <NumberInput value={staticValidation.maxLength} onChange={(v) => updateStaticValidation('maxLength', v)} placeholder="255" />
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Length Message">
                                            <TextInput
                                                value={staticValidation.minLengthMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('minLengthMessage', v || undefined)}
                                                placeholder="Too short"
                                            />
                                        </Label>
                                        <Label text="Max Length Message">
                                            <TextInput
                                                value={staticValidation.maxLengthMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('maxLengthMessage', v || undefined)}
                                                placeholder="Too long"
                                            />
                                        </Label>
                                    </div>
                                    <Label text="Pattern (Regex)">
                                        <TextInput
                                            value={staticValidation.pattern ?? ''}
                                            onChange={(v) => updateStaticValidation('pattern', v || undefined)}
                                            placeholder="^[a-z0-9-]+$"
                                        />
                                    </Label>
                                    <Label text="Pattern Message">
                                        <TextInput
                                            value={staticValidation.patternMessage ?? ''}
                                            onChange={(v) => updateStaticValidation('patternMessage', v || undefined)}
                                            placeholder="Invalid format"
                                        />
                                    </Label>
                                </>
                            )}
                            {isNumberType && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min">
                                            <NumberInput value={staticValidation.min} onChange={(v) => updateStaticValidation('min', v)} placeholder="0" />
                                        </Label>
                                        <Label text="Max">
                                            <NumberInput value={staticValidation.max} onChange={(v) => updateStaticValidation('max', v)} placeholder="100" />
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Message">
                                            <TextInput
                                                value={staticValidation.minMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('minMessage', v || undefined)}
                                                placeholder="Value too low"
                                            />
                                        </Label>
                                        <Label text="Max Message">
                                            <TextInput
                                                value={staticValidation.maxMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('maxMessage', v || undefined)}
                                                placeholder="Value too high"
                                            />
                                        </Label>
                                    </div>
                                </>
                            )}
                            {isMultiSelectType && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Items">
                                            <NumberInput value={staticValidation.min} onChange={(v) => updateStaticValidation('min', v)} placeholder="0" />
                                        </Label>
                                        <Label text="Max Items">
                                            <NumberInput value={staticValidation.max} onChange={(v) => updateStaticValidation('max', v)} placeholder="10" />
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Items Message">
                                            <TextInput
                                                value={staticValidation.minMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('minMessage', v || undefined)}
                                                placeholder="Select at least..."
                                            />
                                        </Label>
                                        <Label text="Max Items Message">
                                            <TextInput
                                                value={staticValidation.maxMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('maxMessage', v || undefined)}
                                                placeholder="Select at most..."
                                            />
                                        </Label>
                                    </div>
                                </>
                            )}
                            {isDateType && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Date">
                                            <DateInput value={staticValidation.minDate ?? ''} onChange={(v) => updateStaticValidation('minDate', v || undefined)} />
                                        </Label>
                                        <Label text="Max Date">
                                            <DateInput value={staticValidation.maxDate ?? ''} onChange={(v) => updateStaticValidation('maxDate', v || undefined)} />
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Date Message">
                                            <TextInput
                                                value={staticValidation.minDateMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('minDateMessage', v || undefined)}
                                                placeholder="Date too early"
                                            />
                                        </Label>
                                        <Label text="Max Date Message">
                                            <TextInput
                                                value={staticValidation.maxDateMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('maxDateMessage', v || undefined)}
                                                placeholder="Date too late"
                                            />
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Date Field">
                                            <SelectInput
                                                value={staticValidation.minDateField ?? ''}
                                                onChange={(v) => updateStaticValidation('minDateField', v || undefined)}
                                                options={otherFieldOptions}
                                                placeholder="e.g. start_date"
                                            />
                                        </Label>
                                        <Label text="Max Date Field">
                                            <SelectInput
                                                value={staticValidation.maxDateField ?? ''}
                                                onChange={(v) => updateStaticValidation('maxDateField', v || undefined)}
                                                options={otherFieldOptions}
                                                placeholder="e.g. end_date"
                                            />
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Min Date Field Message">
                                            <TextInput
                                                value={staticValidation.minDateFieldMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('minDateFieldMessage', v || undefined)}
                                                placeholder="Must be after start date"
                                            />
                                        </Label>
                                        <Label text="Max Date Field Message">
                                            <TextInput
                                                value={staticValidation.maxDateFieldMessage ?? ''}
                                                onChange={(v) => updateStaticValidation('maxDateFieldMessage', v || undefined)}
                                                placeholder="Must be before end date"
                                            />
                                        </Label>
                                    </div>
                                </>
                            )}
                            {isCheckboxType && <p className="text-[10px] text-gray-400 italic">Use the Required toggle above to enforce that this checkbox must be checked</p>}
                            {!isStringType && !isNumberType && !isMultiSelectType && !isCheckboxType && !isDateType && (
                                <p className="text-[10px] text-gray-400 italic">No static validation available for this field type</p>
                            )}
                        </div>
                    )}
                </div>

                {/*  Conditional Validation (not for checkbox)  */}
                {!isCheckboxType && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1">
                            {sectionHeader('conditionalValidation', 'Conditional Validation')}
                            <span className="text-[10px] font-normal text-gray-400 shrink-0">(runs alongside static)</span>
                        </div>
                        {!collapsed.conditionalValidation && (
                            <div className="space-y-3">
                                {conditionalValidations.map((cv, idx) => (
                                    <div key={idx} className="pl-2 border-l-2 border-amber-200 space-y-2 bg-amber-50/30 rounded-r p-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-amber-700">Rule {idx + 1}</span>
                                            <button type="button" onClick={() => removeConditionalValidation(idx)} className="text-red-400 hover:text-red-600">
                                                <X size={11} />
                                            </button>
                                        </div>

                                        {/* When condition */}
                                        <div className="text-[10px] font-medium text-gray-500 mb-1">When:</div>
                                        <ConditionEditor
                                            condition={cv.when}
                                            fieldOptions={otherFieldOptions}
                                            onChange={(c) => updateConditionalValidation(idx, { ...cv, when: c })}
                                            onRemove={() => removeConditionalValidation(idx)}
                                            hideRemove
                                        />

                                        {/* Rules */}
                                        <div className="text-[10px] font-medium text-gray-500 mt-2 mb-1">Then validate:</div>
                                        <div className="space-y-1 pl-2 border-l-2 border-blue-100">
                                            {isStringType && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Length">
                                                            <NumberInput
                                                                value={cv.rules.minLength}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minLength: v } })}
                                                                placeholder="0"
                                                            />
                                                        </Label>
                                                        <Label text="Max Length">
                                                            <NumberInput
                                                                value={cv.rules.maxLength}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxLength: v } })}
                                                                placeholder="255"
                                                            />
                                                        </Label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Length Message">
                                                            <TextInput
                                                                value={cv.rules.minLengthMessage ?? ''}
                                                                onChange={(v) =>
                                                                    updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minLengthMessage: v || undefined } })
                                                                }
                                                                placeholder="Too short"
                                                            />
                                                        </Label>
                                                        <Label text="Max Length Message">
                                                            <TextInput
                                                                value={cv.rules.maxLengthMessage ?? ''}
                                                                onChange={(v) =>
                                                                    updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxLengthMessage: v || undefined } })
                                                                }
                                                                placeholder="Too long"
                                                            />
                                                        </Label>
                                                    </div>
                                                    <Label text="Pattern">
                                                        <TextInput
                                                            value={cv.rules.pattern ?? ''}
                                                            onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, pattern: v || undefined } })}
                                                            placeholder="^[a-z]+$"
                                                        />
                                                    </Label>
                                                    <Label text="Pattern Message">
                                                        <TextInput
                                                            value={cv.rules.patternMessage ?? ''}
                                                            onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, patternMessage: v || undefined } })}
                                                            placeholder="Invalid format"
                                                        />
                                                    </Label>
                                                </>
                                            )}
                                            {isNumberType && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min">
                                                            <NumberInput
                                                                value={cv.rules.min}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, min: v } })}
                                                                placeholder="0"
                                                            />
                                                        </Label>
                                                        <Label text="Max">
                                                            <NumberInput
                                                                value={cv.rules.max}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, max: v } })}
                                                                placeholder="100"
                                                            />
                                                        </Label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Message">
                                                            <TextInput
                                                                value={cv.rules.minMessage ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minMessage: v || undefined } })}
                                                                placeholder="Value too low"
                                                            />
                                                        </Label>
                                                        <Label text="Max Message">
                                                            <TextInput
                                                                value={cv.rules.maxMessage ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxMessage: v || undefined } })}
                                                                placeholder="Value too high"
                                                            />
                                                        </Label>
                                                    </div>
                                                </>
                                            )}
                                            {isMultiSelectType && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Items">
                                                            <NumberInput
                                                                value={cv.rules.min}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, min: v } })}
                                                                placeholder="0"
                                                            />
                                                        </Label>
                                                        <Label text="Max Items">
                                                            <NumberInput
                                                                value={cv.rules.max}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, max: v } })}
                                                                placeholder="10"
                                                            />
                                                        </Label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Items Message">
                                                            <TextInput
                                                                value={cv.rules.minMessage ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minMessage: v || undefined } })}
                                                                placeholder="Select at least..."
                                                            />
                                                        </Label>
                                                        <Label text="Max Items Message">
                                                            <TextInput
                                                                value={cv.rules.maxMessage ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxMessage: v || undefined } })}
                                                                placeholder="Select at most..."
                                                            />
                                                        </Label>
                                                    </div>
                                                </>
                                            )}
                                            {isDateType && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Date">
                                                            <DateInput
                                                                value={cv.rules.minDate ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minDate: v || undefined } })}
                                                            />
                                                        </Label>
                                                        <Label text="Max Date">
                                                            <DateInput
                                                                value={cv.rules.maxDate ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxDate: v || undefined } })}
                                                            />
                                                        </Label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Date Message">
                                                            <TextInput
                                                                value={cv.rules.minDateMessage ?? ''}
                                                                onChange={(v) =>
                                                                    updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minDateMessage: v || undefined } })
                                                                }
                                                                placeholder="Date too early"
                                                            />
                                                        </Label>
                                                        <Label text="Max Date Message">
                                                            <TextInput
                                                                value={cv.rules.maxDateMessage ?? ''}
                                                                onChange={(v) =>
                                                                    updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxDateMessage: v || undefined } })
                                                                }
                                                                placeholder="Date too late"
                                                            />
                                                        </Label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Date Field">
                                                            <SelectInput
                                                                value={cv.rules.minDateField ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minDateField: v || undefined } })}
                                                                options={otherFieldOptions}
                                                                placeholder="e.g. start_date"
                                                            />
                                                        </Label>
                                                        <Label text="Max Date Field">
                                                            <SelectInput
                                                                value={cv.rules.maxDateField ?? ''}
                                                                onChange={(v) => updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxDateField: v || undefined } })}
                                                                options={otherFieldOptions}
                                                                placeholder="e.g. end_date"
                                                            />
                                                        </Label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Label text="Min Date Field Message">
                                                            <TextInput
                                                                value={cv.rules.minDateFieldMessage ?? ''}
                                                                onChange={(v) =>
                                                                    updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, minDateFieldMessage: v || undefined } })
                                                                }
                                                                placeholder="Must be after start date"
                                                            />
                                                        </Label>
                                                        <Label text="Max Date Field Message">
                                                            <TextInput
                                                                value={cv.rules.maxDateFieldMessage ?? ''}
                                                                onChange={(v) =>
                                                                    updateConditionalValidation(idx, { ...cv, rules: { ...cv.rules, maxDateFieldMessage: v || undefined } })
                                                                }
                                                                placeholder="Must be before end date"
                                                            />
                                                        </Label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        addConditionalValidation();
                                        expand('conditionalValidation');
                                    }}
                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700"
                                >
                                    <Plus size={10} /> Add Conditional Rule
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/*  Visible When  */}
                <div className="space-y-2">
                    {sectionHeader(
                        'visibleWhen',
                        'Visible When',
                        !collapsed.visibleWhen && !field.visibleWhen ? (
                            <button
                                type="button"
                                className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
                                onClick={() => {
                                    onChange({ ...field, visibleWhen: { field: '', operator: 'not_empty' } });
                                    expand('visibleWhen');
                                }}
                            >
                                + Add
                            </button>
                        ) : undefined,
                    )}
                    {!collapsed.visibleWhen && field.visibleWhen && (
                        <ConditionEditor
                            condition={field.visibleWhen}
                            fieldOptions={otherFieldOptions}
                            onChange={(c) => update('visibleWhen', c)}
                            onRemove={() => update('visibleWhen', undefined)}
                        />
                    )}
                </div>

                {/*  Disabled When  */}
                <div className="space-y-2">
                    {sectionHeader(
                        'disabledWhen',
                        'Disabled When',
                        !collapsed.disabledWhen && !field.disabledWhen ? (
                            <button
                                type="button"
                                className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
                                onClick={() => {
                                    onChange({ ...field, disabledWhen: { field: '', operator: 'not_empty' } });
                                    expand('disabledWhen');
                                }}
                            >
                                + Add
                            </button>
                        ) : undefined,
                    )}
                    {!collapsed.disabledWhen && field.disabledWhen && (
                        <ConditionEditor
                            condition={field.disabledWhen}
                            fieldOptions={otherFieldOptions}
                            onChange={(c) => update('disabledWhen', c)}
                            onRemove={() => update('disabledWhen', undefined)}
                        />
                    )}
                </div>

                {/*  onChange Effects  */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1">
                        {sectionHeader('onChangeEffects', 'onChange Effects')}
                        <span className="text-[10px] font-normal text-gray-400 shrink-0">(set other fields on change)</span>
                    </div>
                    {!collapsed.onChangeEffects && (
                        <div className="space-y-3">
                            {onChangeEffects.map((effect, idx) => (
                                <div key={idx} className="pl-2 border-l-2 border-green-200 space-y-2 bg-green-50/30 rounded-r p-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-green-700">Effect {idx + 1}</span>
                                        <button type="button" onClick={() => removeOnChangeEffect(idx)} className="text-red-400 hover:text-red-600">
                                            <X size={11} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="Target Field" required>
                                            <SelectInput
                                                value={effect.setField}
                                                onChange={(v) => updateOnChangeEffect(idx, { ...effect, setField: v })}
                                                options={otherFieldOptions}
                                                placeholder="Select field..."
                                            />
                                        </Label>
                                        <Label text="Set Value" required>
                                            <TextInput
                                                value={effect.setValue !== undefined && effect.setValue !== null ? String(effect.setValue) : ''}
                                                onChange={(v) => {
                                                    // Auto-detect type
                                                    if (v === 'true') updateOnChangeEffect(idx, { ...effect, setValue: true });
                                                    else if (v === 'false') updateOnChangeEffect(idx, { ...effect, setValue: false });
                                                    else if (!isNaN(Number(v)) && v.trim() !== '' && !v.includes('{'))
                                                        updateOnChangeEffect(idx, { ...effect, setValue: Number(v) });
                                                    else updateOnChangeEffect(idx, { ...effect, setValue: v });
                                                }}
                                                placeholder="value or {field:key} template"
                                            />
                                        </Label>
                                    </div>

                                    {/* Optional condition */}
                                    <div className="text-[10px] font-medium text-gray-500 mb-1">
                                        Only when:
                                        {!effect.when && (
                                            <button
                                                type="button"
                                                className="ml-2 text-[10px] text-blue-500 hover:text-blue-700"
                                                onClick={() => updateOnChangeEffect(idx, { ...effect, when: { field: field.name, operator: 'not_empty' } })}
                                            >
                                                + Add Condition
                                            </button>
                                        )}
                                        <span className="ml-1 text-[9px] text-gray-400">(leave empty = always fire)</span>
                                    </div>
                                    {effect.when && (
                                        <ConditionEditor
                                            condition={effect.when}
                                            fieldOptions={[{ label: field.name + ' (this field)', value: field.name }, ...otherFieldOptions]}
                                            onChange={(c) => updateOnChangeEffect(idx, { ...effect, when: c })}
                                            onRemove={() => updateOnChangeEffect(idx, { ...effect, when: undefined })}
                                        />
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    addOnChangeEffect();
                                    expand('onChangeEffects');
                                }}
                                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700"
                            >
                                <Plus size={10} /> Add onChange Effect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

//  Sub-components

/** Inline editor for static options (label/value pairs) */
const OptionsEditor: React.FC<{
    options: { label: string; value: string }[];
    onChange: (options: { label: string; value: string }[]) => void;
}> = ({ options, onChange }) => (
    <div className="space-y-1">
        {options.map((opt, i) => (
            <div key={i} className="flex gap-1 items-center">
                <TextInput
                    value={opt.label}
                    onChange={(v) => {
                        const u = [...options];
                        u[i] = { ...opt, label: v };
                        onChange(u);
                    }}
                    placeholder="Label"
                    className="flex-1 text-[11px]"
                />
                <TextInput
                    value={opt.value}
                    onChange={(v) => {
                        const u = [...options];
                        u[i] = { ...opt, value: v };
                        onChange(u);
                    }}
                    placeholder="Value"
                    className="flex-1 text-[11px]"
                />
                <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0">
                    <X size={12} />
                </button>
            </div>
        ))}
        <button type="button" onClick={() => onChange([...options, { label: '', value: '' }])} className="text-[10px] text-blue-500 hover:text-blue-700">
            + Add Option
        </button>
    </div>
);

const CONDITION_SOURCE_OPTIONS = [
    { label: 'Form Field', value: 'field' },
    { label: 'Meta', value: 'meta' },
    { label: 'Initial Value', value: 'initialValue' },
];

/** Parse a condition field string into source prefix and key */
const parseConditionField = (field: string): { source: string; key: string } => {
    if (field.startsWith('meta:')) return { source: 'meta', key: field.slice(5) };
    if (field.startsWith('initialValue:')) return { source: 'initialValue', key: field.slice(13) };
    return { source: 'field', key: field };
};

/** Build a condition field string from source and key */
const buildConditionField = (source: string, key: string): string => {
    if (source === 'meta') return `meta:${key}`;
    if (source === 'initialValue') return `initialValue:${key}`;
    return key;
};

/** Single condition row editor */
const SingleConditionRow: React.FC<{
    condition: FieldCondition;
    fieldOptions: { label: string; value: string }[];
    onChange: (c: FieldCondition) => void;
    onRemove?: () => void;
}> = ({ condition, fieldOptions, onChange, onRemove }) => {
    const needsValue = !['not_empty', 'empty'].includes(condition.operator);
    const isArrayOperator = ['in', 'not_in'].includes(condition.operator);
    const { source, key } = parseConditionField(condition.field);
    return (
        <div className="space-y-1 pl-2 border-l-2 border-blue-100">
            <div className="grid grid-cols-2 gap-2">
                <Label text="Source">
                    <SelectInput
                        value={source}
                        onChange={(v) => onChange({ ...condition, field: buildConditionField(v, v === 'field' ? '' : key) })}
                        options={CONDITION_SOURCE_OPTIONS}
                    />
                </Label>
                <Label text="Field">
                    {source === 'field' ? (
                        <SelectInput value={key} onChange={(v) => onChange({ ...condition, field: v })} options={fieldOptions} placeholder="Select field..." />
                    ) : (
                        <TextInput
                            value={key}
                            onChange={(v) => onChange({ ...condition, field: buildConditionField(source, v) })}
                            placeholder={source === 'meta' ? 'e.g. ticketType' : 'e.g. original_status'}
                        />
                    )}
                </Label>
            </div>
            <Label text="Operator">
                <SelectInput
                    value={condition.operator}
                    onChange={(v) => onChange({ ...condition, operator: v as ConditionOperator })}
                    options={OPERATOR_OPTIONS}
                    placeholder="Select operator..."
                />
            </Label>
            {needsValue && isArrayOperator && (
                <Label text="Values (comma-separated)">
                    <TemplateCSVInput
                        value={Array.isArray(condition.value) ? (condition.value as string[]).join(', ') : String(condition.value ?? '')}
                        onChange={(v) => {
                            const values = v
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                            onChange({ ...condition, value: values });
                        }}
                        placeholder="value1, value2, value3"
                    />
                </Label>
            )}
            {needsValue && !isArrayOperator && (
                <Label text="Value">
                    <TemplateInput
                        value={String(condition.value ?? '')}
                        onChange={(v) => onChange({ ...condition, value: v })}
                        placeholder="Static value or {meta:key}, {field:key} template"
                    />
                </Label>
            )}
            {onRemove && (
                <button type="button" onClick={onRemove} className="text-[10px] text-red-400 hover:text-red-600">
                    <X size={10} className="inline mr-0.5" />
                    Remove
                </button>
            )}
        </div>
    );
};

const JOIN_OPTIONS = [
    { label: 'AND (all must match)', value: 'and' },
    { label: 'OR (any must match)', value: 'or' },
];

/** Condition editor supporting single-field and multi-field (AND/OR) conditions */
const ConditionEditor: React.FC<{
    condition: SerializableCondition;
    fieldOptions: { label: string; value: string }[];
    onChange: (c: SerializableCondition) => void;
    onRemove: () => void;
    hideRemove?: boolean;
}> = ({ condition, fieldOptions, onChange, onRemove, hideRemove }) => {
    const isMulti = 'join' in condition;

    // Convert single -> multi
    const convertToMulti = () => {
        const single = condition as FieldCondition;
        const multi: MultiFieldCondition = {
            join: 'and',
            conditions: [single, { field: '', operator: 'not_empty' }],
        };
        onChange(multi);
    };

    // Convert multi -> single (takes first condition)
    const convertToSingle = () => {
        const multi = condition as MultiFieldCondition;
        onChange(multi.conditions[0] ?? { field: '', operator: 'not_empty' });
    };

    if (isMulti) {
        const multi = condition as MultiFieldCondition;
        return (
            <div className="space-y-2 pl-2 border-l-2 border-indigo-200 bg-indigo-50/30 rounded-r p-2">
                <div className="flex items-center gap-2">
                    <Label text="Join">
                        <SelectInput value={multi.join} onChange={(v) => onChange({ ...multi, join: v as 'and' | 'or' })} options={JOIN_OPTIONS} />
                    </Label>
                </div>
                {multi.conditions.map((c, i) => (
                    <div key={i} className="space-y-1">
                        {i > 0 && <div className="text-[9px] font-semibold text-indigo-400 uppercase">{multi.join}</div>}
                        <SingleConditionRow
                            condition={c}
                            fieldOptions={fieldOptions}
                            onChange={(updated) => {
                                const conditions = [...multi.conditions];
                                conditions[i] = updated;
                                onChange({ ...multi, conditions });
                            }}
                            onRemove={
                                multi.conditions.length > 2
                                    ? () => {
                                          const conditions = multi.conditions.filter((_, j) => j !== i);
                                          onChange({ ...multi, conditions });
                                      }
                                    : undefined
                            }
                        />
                    </div>
                ))}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onChange({ ...multi, conditions: [...multi.conditions, { field: '', operator: 'not_empty' }] })}
                        className="text-[10px] text-blue-500 hover:text-blue-700"
                    >
                        <Plus size={10} className="inline mr-0.5" />
                        Add Condition
                    </button>
                    <button type="button" onClick={convertToSingle} className="text-[10px] text-gray-400 hover:text-gray-600">
                        Switch to Single
                    </button>
                </div>
                {!hideRemove && (
                    <button type="button" onClick={onRemove} className="text-[10px] text-red-500 hover:text-red-700">
                        Remove Condition
                    </button>
                )}
            </div>
        );
    }

    // Single-field condition
    const single = condition as FieldCondition;
    return (
        <div className="space-y-1">
            <SingleConditionRow condition={single} fieldOptions={fieldOptions} onChange={onChange} />
            <div className="flex gap-2">
                <button type="button" onClick={convertToMulti} className="text-[10px] text-indigo-500 hover:text-indigo-700">
                    <Plus size={10} className="inline mr-0.5" />
                    Add AND/OR Condition
                </button>
            </div>
            {!hideRemove && (
                <button type="button" onClick={onRemove} className="text-[10px] text-red-500 hover:text-red-700">
                    Remove Condition
                </button>
            )}
        </div>
    );
};

export default FieldConfigPanel;
