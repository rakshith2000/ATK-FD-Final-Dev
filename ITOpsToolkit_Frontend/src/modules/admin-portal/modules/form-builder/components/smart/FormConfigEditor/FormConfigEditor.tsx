import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';

import { TextInput, SelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import Modal from '@/shared/components/ui/Modal/Modal';
import { Save, Plus, Trash2, GripVertical, Copy, Eye, ChevronUp, ChevronDown, X, Code, ChevronRight } from 'lucide-react';
import type { MetaFieldDefinition, SerializableFieldConfig, SerializableSubmitConfig, SerializableInitialValuesConfig, FormConfigRecord } from '../../../types/form-config';
import type { FormMode, FormSubmitGuardType, SubmitGuardMessages } from '@/shared/modules/dynamic-form/types';
import { CheckboxInput } from '@/shared/components/ui/InputFields';
import FieldConfigPanel from '../FieldConfigPanel/FieldConfigPanel';
import DynamicFormRenderer from '../DynamicFormRenderer/DynamicFormRenderer';
import { validateTemplateString, validateTemplates } from '../../../utils/validate-templates';
import { Label, TemplateInput, TemplateCSVInput, JsonInput } from '../../shared/form-builder-inputs';
import SnowDictionaryImport from './SnowDictionaryImport';
import fetchSnowDictionaries from '../../../services/fetch-snow-dictionaries';
import { BiReset } from 'react-icons/bi';

type EditorMode = 'create' | 'update';

const FORM_TYPE_OPTIONS = [
    { label: 'ServiceNow', value: 'servicenow' },
    { label: 'Standalone', value: 'standalone' },
];

const MODE_OPTIONS = [
    { label: 'Create', value: 'create' },
    { label: 'Update', value: 'update' },
    { label: 'Delete', value: 'delete' },
    { label: 'View', value: 'view' },
];

const HTTP_METHOD_OPTIONS = [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'PATCH', value: 'PATCH' },
    { label: 'DELETE', value: 'DELETE' },
];

const FETCH_METHOD_OPTIONS = [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
];

const API_CLIENT_OPTIONS = [
    { label: 'Backend', value: 'backend' },
    { label: 'ServiceNow', value: 'service-now' },
];

const SUBMIT_WITH_VALUES_OPTIONS = [
    { label: 'Changed Only', value: 'changed-only' },
    { label: 'All Values', value: 'all-values' },
];

const META_TYPE_OPTIONS = [
    { label: 'string', value: 'string' },
    { label: 'number', value: 'number' },
    { label: 'boolean', value: 'boolean' },
];

/** Build the submitGuards array from individual checkboxes.
 *  Always returns an array - `[]` means "no guards" (persists to DB as empty array). */
function buildSubmitGuards(noChanges: boolean, confirm: boolean): FormSubmitGuardType[] {
    const guards: FormSubmitGuardType[] = [];
    if (noChanges) guards.push('no-changes');
    if (confirm) guards.push('confirm-before-submit');
    return guards;
}

/** Check if any guard message overrides are set */
function hasGuardMessages(msgs: SubmitGuardMessages): boolean {
    return Object.values(msgs).some((v) => typeof v === 'string' && v.trim() !== '');
}

interface FormConfigEditorProps {
    mode: EditorMode;
    initial?: FormConfigRecord;
    isSubmitting: boolean;
    onSave: (data: {
        code: string;
        name: string;
        description?: string;
        mode?: FormMode;
        submitLabel?: string;
        submittingLabel?: string;
        cancelLabel?: string;
        trackDirty?: boolean;
        submitWithValues?: 'changed-only' | 'all-values';
        submitGuards?: FormSubmitGuardType[];
        submitGuardMessages?: SubmitGuardMessages;
        fields: SerializableFieldConfig[];
        submitConfig?: SerializableSubmitConfig;
        initialValuesConfig?: SerializableInitialValuesConfig;
        metaFields?: MetaFieldDefinition[];
        formType?: 'servicenow' | 'standalone';
        snowDictName?: string;
    }) => void;
    isResetingToSeeder?: boolean;
    onResetConfigToSeederLevel?: () => Promise<void>;
    onDelete?: () => Promise<void>;
    isDeleting?: boolean;
}

interface FieldDragItemProps {
    field: SerializableFieldConfig;
    index: number;
    selectedIndex: number | null;
    setSelectedIndex: (idx: number | null) => void;
    toggleFieldInclusion: (idx: number) => void;
    moveField: (from: number, to: number) => void;
    duplicateField: (idx: number) => void;
    removeField: (idx: number) => void;
    formType: 'servicenow' | 'standalone';
    fieldsCount: number;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const FieldDragItem: React.FC<FieldDragItemProps> = ({
    field,
    index,
    selectedIndex,
    setSelectedIndex,
    toggleFieldInclusion,
    moveField,
    duplicateField,
    removeField,
    formType,
    fieldsCount,
    scrollContainerRef,
}) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            as="div"
            value={field}
            dragListener={false}
            dragControls={dragControls}
            onDrag={(_, info) => {
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const rect = container.getBoundingClientRect();
                    const clientY = info.point.y;

                    const relativeY = clientY - rect.top;
                    const threshold = 40;
                    const scrollSpeed = 10;

                    if (relativeY < threshold) {
                        container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
                    } else if (rect.height - relativeY < threshold) {
                        container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + scrollSpeed);
                    }
                }
            }}
            onTap={() => setSelectedIndex(index)}
            className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors select-none ${
                selectedIndex === index ? 'bg-blue-50 border-l-2 border-l-blue-400' : 'hover:bg-gray-50 border-l-2 border-l-transparent'
            } ${field.hidden ? 'opacity-50' : ''}`}
        >
            <input
                type="checkbox"
                checked={!field.hidden}
                onChange={(e) => {
                    e.stopPropagation();
                    toggleFieldInclusion(index);
                }}
                onClick={(e) => e.stopPropagation()}
                className="size-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer shrink-0"
                title={field.hidden ? 'Excluded from form - click to include' : 'Included in form - click to exclude'}
            />
            <div
                onPointerDown={(e) => {
                    e.preventDefault();
                    dragControls.start(e);
                }}
                className="cursor-grab shrink-0 touch-none p-1 -m-1"
                title="Drag to reorder"
            >
                <GripVertical size={12} className="text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-800 truncate">{field.label || field.name || 'Unnamed'}</span>
                    {field.required && <span className="text-red-400 text-[10px]">*</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{field.type}</span>
                    <span className="text-[10px] text-gray-400 truncate">{field.name}</span>
                </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => moveField(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 cursor-pointer"
                    title="Move up"
                >
                    <ChevronUp size={11} />
                </button>
                <button
                    type="button"
                    onClick={() => moveField(index, Math.min(fieldsCount - 1, index + 1))}
                    disabled={index === fieldsCount - 1}
                    className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 cursor-pointer"
                    title="Move down"
                >
                    <ChevronDown size={11} />
                </button>
                {formType === 'standalone' ? (
                    <button type="button" onClick={() => duplicateField(index)} className="p-0.5 text-gray-300 hover:text-blue-500 cursor-pointer" title="Duplicate">
                        <Copy size={11} />
                    </button>
                ) : null}
                <button type="button" onClick={() => removeField(index)} className="p-0.5 text-gray-300 hover:text-red-500 cursor-pointer" title="Remove">
                    <Trash2 size={11} />
                </button>
            </div>
        </Reorder.Item>
    );
};

const DEFAULT_FIELD: SerializableFieldConfig = {
    name: '',
    type: 'text',
    label: '',
    colSpan: 1,
};

const FormConfigEditor: React.FC<FormConfigEditorProps> = ({ mode, initial, isSubmitting, onSave, isResetingToSeeder, onResetConfigToSeederLevel, isDeleting, onDelete }) => {
    const isFormGod = sessionStorage.getItem('form_dev') === btoa(window.location.toString());

    const [code, setCode] = useState(initial?.code ?? '');
    const [name, setName] = useState(initial?.name ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [formMode, setFormMode] = useState<FormMode>(initial?.mode ?? 'create');
    const [submitLabel, setSubmitLabel] = useState(initial?.submitLabel ?? '');
    const [submittingLabel, setSubmittingLabel] = useState(initial?.submittingLabel ?? '');
    const [cancelLabel, setCancelLabel] = useState(initial?.cancelLabel ?? '');
    const [trackDirty, setTrackDirty] = useState(initial?.trackDirty ?? false);
    const [submitWithValues, setSubmitWithValues] = useState<'changed-only' | 'all-values'>(initial?.submitWithValues ?? 'changed-only');
    const [guardNoChanges, setGuardNoChanges] = useState(() => initial?.submitGuards?.includes('no-changes') ?? false);
    const [guardConfirm, setGuardConfirm] = useState(() => initial?.submitGuards?.includes('confirm-before-submit') ?? false);
    const [guardMessages, setGuardMessages] = useState<SubmitGuardMessages>(initial?.submitGuardMessages ?? {});
    const [fields, setFields] = useState<SerializableFieldConfig[]>(() => {
        const rawFields = initial?.fields ?? [];
        return [...rawFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    const [formType, setFormType] = useState<'servicenow' | 'standalone'>(initial?.formType ?? 'standalone');
    const [snowDictName, setSnowDictName] = useState(initial?.snowDictName ?? '');
    const [submitConfig, setSubmitConfig] = useState<SerializableSubmitConfig | undefined>(initial?.submitConfig);
    const [initialValuesConfig, setInitialValuesConfig] = useState<SerializableInitialValuesConfig | undefined>(initial?.initialValuesConfig);
    const [metaFields, setMetaFields] = useState<MetaFieldDefinition[]>(initial?.metaFields ?? []);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showDictionaryImport, setShowDictionaryImport] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Section collapse state
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
        header: false,
        guards: true,
        codeOverride: true,
        fields: false,
        submitConfig: true,
        initialValuesConfig: true,
        contract: true,
    });
    const toggleSection = useCallback((key: string) => {
        setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleDictionaryImport = useCallback(
        (importedFields: SerializableFieldConfig[]) => {
            // Only add new fields - never override existing field configs
            const existingNames = new Set(fields.map((f) => f.name));
            const newFields = importedFields.filter((f) => !existingNames.has(f.name));
            setFields([...fields, ...newFields]);
            setShowDictionaryImport(false);
        },
        [fields],
    );

    // Track JsonInput local errors - keyed by a stable identifier per input
    const [jsonInputErrors, setJsonInputErrors] = useState<Record<string, boolean>>({});
    const setJsonError = useCallback((key: string, hasError: boolean) => {
        setJsonInputErrors((prev) => {
            if (prev[key] === hasError) return prev;
            return { ...prev, [key]: hasError };
        });
    }, []);
    const hasJsonInputErrors = Object.values(jsonInputErrors).some(Boolean);

    const allFieldNames = fields.map((f) => f.name);

    //  Field inclusion toggle (hidden property)
    const toggleFieldInclusion = useCallback((index: number) => {
        setFields((prev) => prev.map((f, i) => (i === index ? { ...f, hidden: f.hidden ? undefined : true } : f)));
    }, []);

    //  Field CRUD
    const addField = useCallback(() => {
        const newField: SerializableFieldConfig = {
            ...DEFAULT_FIELD,
            name: `field_${fields.length + 1}`,
            label: `Field ${fields.length + 1}`,
        };
        setFields((prev) => [...prev, newField]);
        setSelectedIndex(fields.length);
        setCollapsed((p) => ({ ...p, fields: false }));
    }, [fields.length]);

    const duplicateField = useCallback(
        (index: number) => {
            const source = fields[index];
            const copy: SerializableFieldConfig = {
                ...JSON.parse(JSON.stringify(source)),
                name: `${source.name}_copy`,
                label: `${source.label} (Copy)`,
            };
            const updated = [...fields];
            updated.splice(index + 1, 0, copy);
            setFields(updated);
            setSelectedIndex(index + 1);
        },
        [fields],
    );

    const removeField = useCallback(
        (index: number) => {
            setFields((prev) => prev.filter((_, i) => i !== index));
            if (selectedIndex === index) setSelectedIndex(null);
            else if (selectedIndex !== null && selectedIndex > index) setSelectedIndex(selectedIndex - 1);
        },
        [selectedIndex],
    );

    const moveField = useCallback((from: number, to: number) => {
        setFields((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(from, 1);
            updated.splice(to, 0, moved);
            return updated;
        });
        setSelectedIndex(to);
    }, []);

    const updateField = useCallback((index: number, updated: SerializableFieldConfig) => {
        setFields((prev) => prev.map((f, i) => (i === index ? updated : f)));
    }, []);

    //  Submit config helpers
    const updateSubmitConfig = useCallback(<K extends keyof SerializableSubmitConfig>(key: K, value: SerializableSubmitConfig[K]) => {
        setSubmitConfig((prev) => ({ ...(prev ?? { url: '', method: 'POST' as const }), [key]: value }));
    }, []);

    //  Initial values config helpers
    const updateInitialValuesConfig = useCallback(<K extends keyof SerializableInitialValuesConfig>(key: K, value: SerializableInitialValuesConfig[K]) => {
        setInitialValuesConfig((prev) => ({ ...(prev ?? { url: '' }), [key]: value }));
    }, []);

    //  Meta fields helpers
    const updateMetaField = useCallback((index: number, updated: MetaFieldDefinition) => {
        setMetaFields((prev) => prev.map((f, i) => (i === index ? updated : f)));
    }, []);

    const handleSave = () => {
        if (!code.trim() || !name.trim()) return;

        onSave({
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || undefined,
            mode: formMode,
            submitLabel: submitLabel.trim() || undefined,
            submittingLabel: submittingLabel.trim() || undefined,
            cancelLabel: cancelLabel.trim() || undefined,
            trackDirty: trackDirty || undefined,
            submitWithValues,
            submitGuards: buildSubmitGuards(guardNoChanges, guardConfirm),
            submitGuardMessages: hasGuardMessages(guardMessages) ? guardMessages : undefined,
            fields: fields.map((f, index) => ({ ...f, order: index })),
            submitConfig,
            initialValuesConfig,
            metaFields: metaFields.length > 0 ? metaFields : undefined,
            formType,
            snowDictName: formType === 'servicenow' ? snowDictName : undefined,
        });
    };

    //  Meta Contract (auto-extracted)
    const metaContract = useMemo(() => {
        /** Per-key usage tracking: key -> list of property labels where used */
        const usages: Record<string, Map<string, string[]>> = {
            meta: new Map(),
            field: new Map(),
            initialValue: new Map(),
            response: new Map(),
        };
        /** Bare tokens without prefix - these are errors */
        const bareErrors: Set<string> = new Set();

        /** Record a key usage for a given prefix */
        const addUsage = (prefix: string, key: string, usageLabel: string) => {
            const map = usages[prefix];
            if (!map) return;
            const existing = map.get(key);
            if (existing) existing.push(usageLabel);
            else map.set(key, [usageLabel]);
        };

        /** Extract and categorize all {token} placeholders from a string */
        /** Bare tokens that are allowed without a prefix (special runtime placeholders) */
        const allowedBareTokens = new Set(['searchTerm']);

        const extractTokens = (value: string, usageLabel: string) => {
            if (typeof value !== 'string') return;
            for (const m of value.matchAll(/\{([^}]{1,500})\}/g)) {
                const token = m[1];
                const colonIdx = token.indexOf(':');
                if (colonIdx >= 0) {
                    addUsage(token.slice(0, colonIdx), token.slice(colonIdx + 1), usageLabel);
                } else if (!allowedBareTokens.has(token)) {
                    bareErrors.add(token);
                }
            }
        };

        const extractFromParams = (params: Record<string, unknown> | undefined, labelPrefix: string) => {
            if (!params) return;
            for (const [key, val] of Object.entries(params)) {
                extractMappingTokens(val, `${labelPrefix} queryParams.${key}`);
            }
        };

        const extractFromBodyParams = (params: Record<string, unknown> | undefined, labelPrefix: string) => {
            if (!params) return;
            for (const [key, val] of Object.entries(params)) {
                extractMappingTokens(val, `${labelPrefix} bodyParams.${key}`);
            }
        };

        const extractFromQueryKey = (qk: string[] | undefined, label: string) => {
            if (!qk) return;
            qk.forEach((s, i) => extractTokens(s, `${label} queryKey[${i}]`));
        };

        const extractConditionTokens = (cond: { field?: string; value?: unknown; conditions?: { field?: string; value?: unknown }[] } | undefined, label: string) => {
            if (!cond) return;
            if (typeof cond.field === 'string' && cond.field.includes(':')) {
                const colonIdx = cond.field.indexOf(':');
                addUsage(cond.field.slice(0, colonIdx), cond.field.slice(colonIdx + 1), `${label} condition.field`);
            }
            if (typeof cond.value === 'string') extractTokens(cond.value, `${label} condition.value`);
            if (cond.conditions) cond.conditions.forEach((c) => extractConditionTokens(c, label));
        };

        const extractMappingTokens = (v: unknown, path: string) => {
            if (typeof v === 'string') {
                extractTokens(v, path);
            } else if (v && typeof v === 'object') {
                const dict = v as Record<string, unknown>;
                for (const [k, sv] of Object.entries(dict)) {
                    extractMappingTokens(sv, `${path}.${k}`);
                }
            }
        };

        // Submit config
        if (submitConfig?.url) {
            extractTokens(submitConfig.url, 'submitConfig URL');
            extractFromParams(submitConfig.requestParams?.queryParams, 'submitConfig');
            extractFromBodyParams(submitConfig.requestParams?.bodyParams, 'submitConfig');
            if (submitConfig.bodyMapping) {
                for (const [key, val] of Object.entries(submitConfig.bodyMapping)) {
                    extractMappingTokens(val, `submitConfig bodyMapping.${key}`);
                }
            }
        }
        extractFromQueryKey(submitConfig?.queryKeyToInvalidate, 'submitConfig');

        // Initial values config
        if (initialValuesConfig?.url) {
            extractTokens(initialValuesConfig.url, 'initialValuesConfig URL');
            extractFromParams(initialValuesConfig.requestParams?.queryParams, 'initialValuesConfig');
            extractFromBodyParams(initialValuesConfig.requestParams?.bodyParams, 'initialValuesConfig');
            if (initialValuesConfig.fieldMapping) {
                for (const [key, val] of Object.entries(initialValuesConfig.fieldMapping)) {
                    extractMappingTokens(val, `initialValuesConfig fieldMapping.${key}`);
                }
            }
        }
        extractFromQueryKey(initialValuesConfig?.queryKey, 'initialValuesConfig');

        // All field configs
        for (const f of fields) {
            if (f.asyncOptions) {
                const ao = f.asyncOptions;
                if (ao.url) extractTokens(ao.url, `${f.name} asyncOptions URL`);
                if (ao.labelKey) extractTokens(ao.labelKey, `${f.name} asyncOptions labelKey`);
                if (ao.valueKey) extractTokens(ao.valueKey, `${f.name} asyncOptions valueKey`);
                if (ao.initialOptionLabelKey) extractTokens(ao.initialOptionLabelKey, `${f.name} asyncOptions initialOptionLabelKey`);
                if (ao.initialOptionValueKey) extractTokens(ao.initialOptionValueKey, `${f.name} asyncOptions initialOptionValueKey`);
                if (ao.searchQueryParam) extractTokens(ao.searchQueryParam, `${f.name} asyncOptions searchQueryParam`);
                extractFromParams(ao.requestParams?.queryParams, `${f.name} asyncOptions`);
                extractFromBodyParams(ao.requestParams?.bodyParams, `${f.name} asyncOptions`);
                extractFromQueryKey(ao.queryKey, `${f.name} asyncOptions`);
            }
            if (f.label) extractTokens(f.label, `${f.name} label`);
            if (f.placeholder) extractTokens(f.placeholder, `${f.name} placeholder`);
            if (typeof f.defaultValue === 'string') extractTokens(f.defaultValue, `${f.name} defaultValue`);
            extractConditionTokens(f.visibleWhen as never, `${f.name} visibleWhen`);
            extractConditionTokens(f.disabledWhen as never, `${f.name} disabledWhen`);
            extractConditionTokens(f.requiredWhen as never, `${f.name} requiredWhen`);
            if (f.conditionalValidation) {
                (f.conditionalValidation as { when: unknown }[]).forEach((cv, i) => extractConditionTokens(cv.when as never, `${f.name} conditionalValidation[${i}]`));
            }
            if (f.onChangeEffects) {
                (f.onChangeEffects as { when?: unknown; setValue?: unknown }[]).forEach((eff, i) => {
                    extractConditionTokens(eff.when as never, `${f.name} onChangeEffect[${i}]`);
                    if (typeof eff.setValue === 'string') extractTokens(eff.setValue, `${f.name} onChangeEffect[${i}] setValue`);
                });
            }
        }

        // Summary counts
        const totalKeys = Object.values(usages).reduce((sum, map) => sum + map.size, 0);

        return { usages, bareErrors, totalKeys, hasAny: totalKeys > 0, hasBareErrors: bareErrors.size > 0 };
    }, [fields, submitConfig, initialValuesConfig]);

    //  Form-wide template validation
    const templateErrors = useMemo(() => {
        const errors: string[] = [];
        const check = (label: string, value?: string) => {
            if (!value) return;
            const err = validateTemplateString(value);
            if (err) errors.push(`${label}: ${err}`);
        };
        const checkMapping = (label: string, mapping?: Record<string, unknown>) => {
            if (!mapping) return;
            const err = validateTemplates(mapping);
            if (err) errors.push(`${label} ${err}`);
        };
        const checkQueryKey = (label: string, qk?: string[]) => {
            if (!qk) return;
            qk.forEach((s, i) => check(`${label}[${i}]`, s));
        };

        // Submit config
        check('Submit URL', submitConfig?.url);
        checkMapping('Submit bodyMapping', submitConfig?.bodyMapping);
        checkMapping('Submit queryParams', submitConfig?.requestParams?.queryParams);
        checkMapping('Submit bodyParams', submitConfig?.requestParams?.bodyParams);
        checkQueryKey('Submit queryKeyToInvalidate', submitConfig?.queryKeyToInvalidate);

        // Initial values config
        check('Initial Values URL', initialValuesConfig?.url);
        checkMapping('Initial Values fieldMapping', initialValuesConfig?.fieldMapping);
        checkMapping('Initial Values queryParams', initialValuesConfig?.requestParams?.queryParams);
        checkMapping('Initial Values bodyParams', initialValuesConfig?.requestParams?.bodyParams);
        checkQueryKey('Initial Values queryKey', initialValuesConfig?.queryKey);

        // Fields
        for (const f of fields) {
            check(`${f.name} label`, f.label);
            check(`${f.name} placeholder`, f.placeholder);
            if (typeof f.defaultValue === 'string') check(`${f.name} defaultValue`, f.defaultValue);
            if (f.asyncOptions) {
                check(`${f.name} async URL`, f.asyncOptions.url);
                check(`${f.name} labelKey`, f.asyncOptions.labelKey);
                check(`${f.name} valueKey`, f.asyncOptions.valueKey);
                check(`${f.name} initialOptionLabelKey`, f.asyncOptions.initialOptionLabelKey);
                check(`${f.name} initialOptionValueKey`, f.asyncOptions.initialOptionValueKey);
                check(`${f.name} searchQueryParam`, f.asyncOptions.searchQueryParam);
                checkMapping(`${f.name} async queryParams`, f.asyncOptions.requestParams?.queryParams);
                checkMapping(`${f.name} async bodyParams`, f.asyncOptions.requestParams?.bodyParams);
                checkQueryKey(`${f.name} async queryKey`, f.asyncOptions.queryKey);
            }
        }

        return errors;
    }, [fields, submitConfig, initialValuesConfig]);

    const hasTemplateErrors = metaContract.hasBareErrors || templateErrors.length > 0 || hasJsonInputErrors;

    const sectionHeader = (key: string, label: string, extra?: React.ReactNode) => (
        <div className="w-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <button type="button" onClick={() => toggleSection(key)} className="flex items-center gap-1.5 hover:text-gray-600 transition-colors">
                <ChevronRight size={11} className={`shrink-0 transition-transform ${collapsed[key] ? '' : 'rotate-90'}`} />
                <span>{label}</span>
            </button>
            {extra}
        </div>
    );

    return (
        <div className="flex flex-col">
            {/* Form Details */}
            {isFormGod || mode === 'create' ? (
                <div className="border-b border-gray-200">
                    <div className="px-4 py-2">{sectionHeader('header', 'Form Details')}</div>
                    {!collapsed.header && (
                        <div className="px-4 pb-3 space-y-2">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Form Type</label>
                                    <SelectInput
                                        value={formType}
                                        onChange={(v) => {
                                            setFormType(v as 'servicenow' | 'standalone');
                                            if (v !== 'servicenow') setSnowDictName('');
                                        }}
                                        options={FORM_TYPE_OPTIONS}
                                    />
                                </div>
                                {formType === 'servicenow' && (
                                    <div className="space-y-0.5 col-span-1">
                                        <label className="text-[10px] font-medium text-gray-500">
                                            ServiceNow Dictionary Name <span className="text-red-400">*</span>
                                        </label>
                                        <SelectInput
                                            value={snowDictName}
                                            onChange={setSnowDictName}
                                            optionsAsync={fetchSnowDictionaries}
                                            optionsAsyncDebounce={300}
                                            placeholder="Type table name to search..."
                                            clearable={false}
                                        />
                                    </div>
                                )}
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">
                                        Form Code <span className="text-red-400">*</span>
                                    </label>
                                    <TextInput value={code} onChange={setCode} placeholder="e.g. onboard-service" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">
                                        Form Name <span className="text-red-400">*</span>
                                    </label>
                                    <TextInput value={name} onChange={setName} placeholder="e.g. Onboard Service" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Description</label>
                                    <TextInput value={description} onChange={setDescription} placeholder="What is this form for?" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Mode</label>
                                    <SelectInput value={formMode} onChange={(v) => setFormMode(v as FormMode)} options={MODE_OPTIONS} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Submit Button Label</label>
                                    <TextInput value={submitLabel} onChange={setSubmitLabel} placeholder="Submit" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Submitting Label</label>
                                    <TextInput value={submittingLabel} onChange={setSubmittingLabel} placeholder="Submitting..." />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Cancel Button Label</label>
                                    <TextInput value={cancelLabel} onChange={setCancelLabel} placeholder="Cancel" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-medium text-gray-500">Submit Values</label>
                                    <SelectInput
                                        value={submitWithValues}
                                        onChange={(v) => setSubmitWithValues(v as 'changed-only' | 'all-values')}
                                        options={SUBMIT_WITH_VALUES_OPTIONS}
                                    />
                                </div>
                                <div className="space-y-0.5 flex items-end pb-0.5">
                                    <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={trackDirty}
                                            onChange={(e) => setTrackDirty(e.target.checked)}
                                            className="size-3 rounded border-gray-300 text-blue-500"
                                        />
                                        Track Dirty State
                                    </label>
                                </div>
                            </div>
                            {/* Submit Guards */}
                            <div className="space-y-2 pt-1">
                                {sectionHeader('guards', 'Submit Guards')}
                                {!collapsed.guards && (
                                    <div className="space-y-2 pl-4">
                                        <div className="flex gap-4 flex-wrap">
                                            <CheckboxInput label="No Changes Warning" checked={guardNoChanges} onChange={setGuardNoChanges} />
                                            <CheckboxInput label="Confirm Before Submit" checked={guardConfirm} onChange={setGuardConfirm} />
                                        </div>
                                        <p className="text-[9px] text-gray-400">Controls which checks run before form submission. Uncheck all to disable submit guards.</p>
                                        {(guardNoChanges || guardConfirm) && (
                                            <details className="text-[10px]">
                                                <summary className="cursor-pointer text-blue-500 hover:text-blue-700 font-medium">Custom Guard Messages</summary>
                                                <div className="mt-2 space-y-2 pl-2 border-l-2 border-blue-100 overflow-y-auto h-full max-h-32">
                                                    {guardNoChanges && (
                                                        <>
                                                            <Label text="No Changes - Title" className="max-w-[99%]">
                                                                <TextInput
                                                                    value={guardMessages.noChangesTitle ?? ''}
                                                                    onChange={(v) => setGuardMessages((p) => ({ ...p, noChangesTitle: v || undefined }))}
                                                                    placeholder="Nothing's changed"
                                                                />
                                                            </Label>
                                                            <Label text="No Changes - Message" className="max-w-[99%]">
                                                                <TextInput
                                                                    value={guardMessages.noChangesMessage ?? ''}
                                                                    onChange={(v) => setGuardMessages((p) => ({ ...p, noChangesMessage: v || undefined }))}
                                                                    placeholder="No changes detected. Please modify the form before submitting."
                                                                />
                                                            </Label>
                                                        </>
                                                    )}
                                                    {guardConfirm && (
                                                        <>
                                                            <Label text="Confirm - Title" className="max-w-[99%]">
                                                                <TextInput
                                                                    value={guardMessages.confirmTitle ?? ''}
                                                                    onChange={(v) => setGuardMessages((p) => ({ ...p, confirmTitle: v || undefined }))}
                                                                    placeholder="Are you sure?"
                                                                />
                                                            </Label>
                                                            <Label text="Confirm - Message" className="max-w-[99%]">
                                                                <TextInput
                                                                    value={guardMessages.confirmMessage ?? ''}
                                                                    onChange={(v) => setGuardMessages((p) => ({ ...p, confirmMessage: v || undefined }))}
                                                                    placeholder="Do you really want to submit the form with the current changes?"
                                                                />
                                                            </Label>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <Label text="Proceed Button Label" className="max-w-[99%]">
                                                                    <TextInput
                                                                        value={guardMessages.confirmProceedLabel ?? ''}
                                                                        onChange={(v) => setGuardMessages((p) => ({ ...p, confirmProceedLabel: v || undefined }))}
                                                                        placeholder="Proceed"
                                                                    />
                                                                </Label>
                                                                <Label text="Discard Button Label" className="max-w-[99%]">
                                                                    <TextInput
                                                                        value={guardMessages.confirmDiscardLabel ?? ''}
                                                                        onChange={(v) => setGuardMessages((p) => ({ ...p, confirmDiscardLabel: v || undefined }))}
                                                                        placeholder="Discard"
                                                                    />
                                                                </Label>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Code-override info banner */}
            {isFormGod || mode === 'create' ? (
                <div className="border-b border-amber-200 bg-amber-50/60">
                    <button
                        type="button"
                        onClick={() => toggleSection('codeOverride')}
                        className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[10px] text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                        <ChevronRight size={11} className={`shrink-0 transition-transform ${collapsed.codeOverride ? '' : 'rotate-90'}`} />
                        <span className="font-medium">Some features may be overridden at code level</span>
                    </button>
                    {!collapsed.codeOverride && (
                        <div className="px-4 pb-2 text-[10px] text-amber-800 space-y-1.5">
                            <p>
                                Consuming pages can override config-driven behavior with code-level implementations. When this happens, the config value is still stored but the
                                code takes precedence at runtime.
                            </p>
                            <table className="w-full text-[9px] border-collapse">
                                <thead>
                                    <tr className="border-b border-amber-200">
                                        <th className="text-left py-0.5 pr-2 font-semibold">Feature</th>
                                        <th className="text-left py-0.5 pr-2 font-semibold">Config-driven</th>
                                        <th className="text-left py-0.5 font-semibold">When code overrides</th>
                                    </tr>
                                </thead>
                                <tbody className="text-amber-700">
                                    <tr className="border-b border-amber-100">
                                        <td className="py-0.5 pr-2 font-medium">Submit</td>
                                        <td className="py-0.5 pr-2">submitConfig generates the onSubmit handler automatically</td>
                                        <td className="py-0.5">Custom onSubmit replaces it - for custom notifications, form value syncing from response, or external callbacks</td>
                                    </tr>
                                    <tr className="border-b border-amber-100">
                                        <td className="py-0.5 pr-2 font-medium">Initial Values</td>
                                        <td className="py-0.5 pr-2">DynamicFormRenderer fetches from initialValuesConfig.url</td>
                                        <td className="py-0.5">
                                            Caller fetches externally via fetchRawInitialValues / fetchInitialValues and passes pre-fetched data - for raw API access or custom
                                            caching
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-0.5 pr-2 font-medium">Field Mapping</td>
                                        <td className="py-0.5 pr-2">fieldMapping transforms API response keys to form field names</td>
                                        <td className="py-0.5">
                                            fetchRawInitialValues returns unmapped data - caller uses raw response for fallback options or nested structures (e.g., ServiceNow
                                            display_value)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Body: split layout - field list (left) + field editor (right) */}
            <div className="flex">
                {/*  Field List  */}
                <div className="w-1/2 min-w-75 border-r border-gray-200 flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                        <button type="button" onClick={() => toggleSection('fields')} className="flex items-center gap-1.5">
                            <ChevronRight size={11} className={`shrink-0 transition-transform text-gray-400 ${collapsed.fields ? '' : 'rotate-90'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fields ({fields.length})</span>
                        </button>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="flex items-center cursor-pointer gap-1 text-[10px] text-gray-500 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50"
                                title="Preview form"
                            >
                                <Eye size={11} /> Preview
                            </button>
                            {formType === 'servicenow' ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDictionaryImport(true)}
                                    className="flex items-center gap-1 cursor-pointer text-[10px] text-gray-500 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 disabled:opacity-40 disabled:pointer-events-none"
                                    title="Import fields from ServiceNow dictionary"
                                    disabled={!snowDictName}
                                >
                                    <Plus size={11} /> Add Field
                                </button>
                            ) : null}
                            {formType === 'standalone' ? (
                                <button
                                    type="button"
                                    onClick={addField}
                                    className="flex items-center gap-1 text-[10px] cursor-pointer text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded hover:bg-blue-50"
                                >
                                    <Plus size={11} /> Add Field
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex-1">
                        {!collapsed.fields && (
                            <Reorder.Group ref={scrollContainerRef} as="div" axis="y" values={fields} onReorder={setFields} className="min-h-40 max-h-96 overflow-auto">
                                {fields.length === 0 && (
                                    <>
                                        {formType === 'standalone' ? (
                                            <div className="flex flex-col items-center justify-start mt-2 h-40 text-gray-400 text-xs gap-2">
                                                <p>No fields yet</p>
                                                <button type="button" onClick={addField} className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
                                                    <Plus size={12} /> Add your first field
                                                </button>
                                            </div>
                                        ) : null}

                                        {formType === 'servicenow' ? (
                                            <div className="flex flex-col items-center justify-start mt-2 h-40 text-gray-400 text-xs gap-2">
                                                <p>No fields yet</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDictionaryImport(true)}
                                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 disabled:text-blue-200"
                                                    disabled={!snowDictName}
                                                >
                                                    <Plus size={12} /> Add your first field
                                                </button>
                                            </div>
                                        ) : null}
                                    </>
                                )}

                                {fields.map((field, index) => (
                                    <FieldDragItem
                                        key={field.name}
                                        field={field}
                                        index={index}
                                        selectedIndex={selectedIndex}
                                        setSelectedIndex={setSelectedIndex}
                                        toggleFieldInclusion={toggleFieldInclusion}
                                        moveField={moveField}
                                        duplicateField={duplicateField}
                                        removeField={removeField}
                                        formType={formType}
                                        fieldsCount={fields.length}
                                        scrollContainerRef={scrollContainerRef}
                                    />
                                ))}
                            </Reorder.Group>
                        )}

                        {/*  Submit Config  */}
                        <div className="p-3 border-t border-gray-200 space-y-2">
                            {sectionHeader(
                                'submitConfig',
                                'Submit Config',
                                !collapsed.submitConfig && !submitConfig ? (
                                    <button
                                        type="button"
                                        className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
                                        onClick={() => {
                                            setSubmitConfig({ url: '', method: 'POST' });
                                            setCollapsed((p) => ({ ...p, submitConfig: false }));
                                        }}
                                    >
                                        + Add
                                    </button>
                                ) : undefined,
                            )}
                            {!collapsed.submitConfig && submitConfig && (
                                <div className="space-y-2 pl-2 border-l-2 border-green-200">
                                    <Label text="Submit URL" required>
                                        <TemplateInput value={submitConfig.url} onChange={(v) => updateSubmitConfig('url', v)} placeholder="/api/{meta:tenantId}/services" />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Supports <code>{'{meta:key}'}</code> and <code>{'{field:key}'}</code> path templates
                                        </p>
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="HTTP Method">
                                            <SelectInput
                                                value={submitConfig.method}
                                                onChange={(v) => updateSubmitConfig('method', v as SerializableSubmitConfig['method'])}
                                                options={HTTP_METHOD_OPTIONS}
                                            />
                                        </Label>
                                        <Label text="API Client">
                                            <SelectInput
                                                value={submitConfig.apiClient ?? 'backend'}
                                                onChange={(v) => updateSubmitConfig('apiClient', v as 'backend' | 'service-now')}
                                                options={API_CLIENT_OPTIONS}
                                            />
                                        </Label>
                                    </div>
                                    <Label text="Body Mapping (JSON)">
                                        <JsonInput
                                            value={submitConfig.bodyMapping}
                                            onChange={(v) => updateSubmitConfig('bodyMapping', v)}
                                            onError={(e) => setJsonError('submit-bodyMapping', e)}
                                            placeholder='{"name": "{field:service_name}", "fullName": "{field:first_name} {field:last_name}"}'
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Key = API field, value = <code>{'{field:key}'}</code> for form values, <code>{'{meta:key}'}</code> for context, or static string
                                        </p>
                                    </Label>
                                    <Label text="Query Keys to Invalidate">
                                        <TemplateCSVInput
                                            value={submitConfig.queryKeyToInvalidate?.join(', ') ?? ''}
                                            onChange={(v) => {
                                                const keys = v
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean);
                                                updateSubmitConfig('queryKeyToInvalidate', keys.length > 0 ? keys : undefined);
                                            }}
                                            placeholder="services, dashboard-{meta:tenantId}"
                                        />
                                    </Label>
                                    <Label text="Query Params (JSON)">
                                        <JsonInput
                                            value={submitConfig.requestParams?.queryParams}
                                            onChange={(v) => updateSubmitConfig('requestParams', { ...submitConfig.requestParams, queryParams: v })}
                                            onError={(e) => setJsonError('submit-queryParams', e)}
                                            placeholder='{"source": "form-builder", "caller": "{meta:assignee}"}'
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Static values or <code>{'{meta:key}'}</code> templates
                                        </p>
                                    </Label>
                                    <button type="button" className="text-[10px] text-red-500 hover:text-red-700" onClick={() => setSubmitConfig(undefined)}>
                                        <X size={10} className="inline mr-0.5" />
                                        Remove Submit Config
                                    </button>
                                </div>
                            )}
                        </div>

                        {/*  Initial Values Config  */}
                        <div className="p-3 border-t border-gray-200 space-y-2">
                            {sectionHeader(
                                'initialValuesConfig',
                                'Initial Values Config',
                                !collapsed.initialValuesConfig && !initialValuesConfig ? (
                                    <button
                                        type="button"
                                        className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
                                        onClick={() => {
                                            setInitialValuesConfig({ url: '' });
                                            setCollapsed((p) => ({ ...p, initialValuesConfig: false }));
                                        }}
                                    >
                                        + Add
                                    </button>
                                ) : undefined,
                            )}
                            {!collapsed.initialValuesConfig && initialValuesConfig && (
                                <div className="space-y-2 pl-2 border-l-2 border-orange-200">
                                    <Label text="Fetch URL" required>
                                        <TemplateInput
                                            value={initialValuesConfig.url}
                                            onChange={(v) => updateInitialValuesConfig('url', v)}
                                            placeholder="/api/{meta:tenantId}/records/{meta:recordId}"
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Supports <code>{'{meta:key}'}</code> path templates resolved from runtime meta
                                        </p>
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Label text="HTTP Method">
                                            <SelectInput
                                                value={initialValuesConfig.method ?? 'GET'}
                                                onChange={(v) => updateInitialValuesConfig('method', v as 'GET' | 'POST')}
                                                options={FETCH_METHOD_OPTIONS}
                                            />
                                        </Label>
                                        <Label text="API Client">
                                            <SelectInput
                                                value={initialValuesConfig.apiClient ?? 'backend'}
                                                onChange={(v) => updateInitialValuesConfig('apiClient', v as 'backend' | 'service-now')}
                                                options={API_CLIENT_OPTIONS}
                                            />
                                        </Label>
                                    </div>
                                    <Label text="Response Path">
                                        <TextInput
                                            value={initialValuesConfig.responsePath ?? ''}
                                            onChange={(v) => updateInitialValuesConfig('responsePath', v || undefined)}
                                            placeholder="data.record"
                                        />
                                    </Label>
                                    <Label text="Field Mapping (JSON)">
                                        <JsonInput
                                            value={initialValuesConfig.fieldMapping}
                                            onChange={(v) => updateInitialValuesConfig('fieldMapping', v)}
                                            onError={(e) => setJsonError('iv-fieldMapping', e)}
                                            placeholder='{"access_level": "{response:accessLevel}", "display_name": "{response:firstName} {response:lastName}"}'
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Key = form field, value = <code>{'{response:apiField}'}</code> or static. e.g. <code>{'"formKey": "{response:apiField}"'}</code>
                                        </p>
                                    </Label>
                                    <Label text="Query Key (comma-separated)">
                                        <TemplateCSVInput
                                            value={initialValuesConfig.queryKey?.join(', ') ?? ''}
                                            onChange={(v) => {
                                                const keys = v
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean);
                                                updateInitialValuesConfig('queryKey', keys.length > 0 ? keys : undefined);
                                            }}
                                            placeholder="record-{meta:recordId}, my-form"
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">Custom React Query cache key. If empty, auto-generated.</p>
                                    </Label>
                                    <Label text="Query Params (JSON)">
                                        <JsonInput
                                            value={initialValuesConfig.requestParams?.queryParams}
                                            onChange={(v) => updateInitialValuesConfig('requestParams', { ...initialValuesConfig.requestParams, queryParams: v })}
                                            onError={(e) => setJsonError('iv-queryParams', e)}
                                            placeholder='{"include": "metadata", "assignee": "{meta:assignee}"}'
                                        />
                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                            Static values or <code>{'{meta:key}'}</code> templates
                                        </p>
                                    </Label>
                                    {(initialValuesConfig.method ?? 'GET') === 'POST' && (
                                        <Label text="Body Params (JSON)">
                                            <JsonInput
                                                value={initialValuesConfig.requestParams?.bodyParams}
                                                onChange={(v) => updateInitialValuesConfig('requestParams', { ...initialValuesConfig.requestParams, bodyParams: v })}
                                                onError={(e) => setJsonError('iv-bodyParams', e)}
                                                placeholder='{"ticketId": "{meta:ticketId}", "fields": "all"}'
                                            />
                                            <p className="text-[9px] text-gray-400 mt-0.5">
                                                Static values or <code>{'{meta:key}'}</code> templates. Sent as JSON body for POST requests.
                                            </p>
                                        </Label>
                                    )}
                                    <button type="button" className="text-[10px] text-red-500 hover:text-red-700" onClick={() => setInitialValuesConfig(undefined)}>
                                        <X size={10} className="inline mr-0.5" />
                                        Remove Initial Values Config
                                    </button>
                                </div>
                            )}
                        </div>

                        {/*  Meta Contract  */}
                        <div className="p-3 border-t border-gray-200 space-y-2">
                            <button
                                type="button"
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 w-full"
                                onClick={() => toggleSection('contract')}
                            >
                                <ChevronRight size={11} className={`shrink-0 transition-transform ${collapsed.contract ? '' : 'rotate-90'}`} />
                                <Code size={11} />
                                <span>Template Contract{metaContract.hasAny ? ` (${metaContract.totalKeys} keys)` : ''}</span>
                            </button>
                            {!collapsed.contract && (
                                <div className="space-y-2 pl-2 border-l-2 border-indigo-200">
                                    {/* Prefix legend */}
                                    <div className="text-[10px] text-gray-400 space-y-0.5">
                                        <p className="font-medium text-gray-500">Every template MUST use a prefix:</p>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pl-1">
                                            <span>
                                                <code className="text-indigo-500">{'{meta:key}'}</code> - page context (URLs, queryParams, queryKey, conditions)
                                            </span>
                                            <span>
                                                <code className="text-green-500">{'{field:key}'}</code> - form values (bodyMapping, queryParams, conditions, labels)
                                            </span>
                                            <span>
                                                <code className="text-amber-500">{'{initialValue:key}'}</code> - pre-loaded data (fieldMapping, labels, defaults)
                                            </span>
                                            <span>
                                                <code className="text-blue-500">{'{response:key}'}</code> - API response (labelKey, valueKey, fieldMapping)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bare token errors */}
                                    {metaContract.hasBareErrors && (
                                        <div className="space-y-0.5 p-1.5 bg-red-50 border border-red-200 rounded">
                                            <span className="text-[10px] font-semibold text-red-600">Bare tokens (errors) - must add a prefix:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {[...metaContract.bareErrors].map((k) => (
                                                    <span key={k} className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-200 font-mono">
                                                        {`{${k}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Template syntax errors */}
                                    {templateErrors.length > 0 && (
                                        <div className="space-y-0.5 p-1.5 bg-red-50 border border-red-200 rounded">
                                            <span className="text-[10px] font-semibold text-red-600">Template syntax errors ({templateErrors.length}):</span>
                                            {templateErrors.map((err, i) => (
                                                <p key={i} className="text-[9px] text-red-600 font-mono">
                                                    {err}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Auto-extracted keys by source */}
                                    {metaContract.hasAny && (
                                        <>
                                            {(
                                                [
                                                    { prefix: 'meta', label: 'meta:', desc: 'runtime context from page code', color: 'indigo' },
                                                    { prefix: 'field', label: 'field:', desc: 'current form field values (runtime)', color: 'green' },
                                                    {
                                                        prefix: 'initialValue',
                                                        label: 'initialValue:',
                                                        desc: 'pre-loaded record values (fieldMapping, labels, defaults)',
                                                        color: 'amber',
                                                    },
                                                    { prefix: 'response', label: 'response:', desc: 'API response data (labelKey, valueKey, fieldMapping)', color: 'blue' },
                                                ] as const
                                            ).map(({ prefix, label, desc, color }) => {
                                                const keyMap = metaContract.usages[prefix];
                                                if (keyMap.size === 0) return null;
                                                return (
                                                    <div key={prefix} className="space-y-1">
                                                        <span className={`text-[10px] font-semibold text-${color}-500`}>
                                                            {label} ({keyMap.size}) - {desc}
                                                        </span>
                                                        <div className="space-y-1 pl-1">
                                                            {[...keyMap.entries()].map(([key, locations]) => (
                                                                <div key={key} className="flex items-start gap-1.5">
                                                                    <span
                                                                        className={`text-[10px] px-1.5 py-0.5 bg-${color}-50 text-${color}-600 rounded border border-${color}-100 font-mono shrink-0`}
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 pt-0.5">{locations.join(', ')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}

                                    {/* Editable meta field definitions */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-gray-500">Meta Fields (define expected shape):</span>
                                            <button
                                                type="button"
                                                className="text-[10px] text-blue-500 hover:text-blue-700"
                                                onClick={() => setMetaFields((prev) => [...prev, { key: '', type: 'string' }])}
                                            >
                                                <Plus size={10} className="inline mr-0.5" />
                                                Add
                                            </button>
                                        </div>
                                        {metaFields.map((mf, i) => (
                                            <div key={i} className="flex items-start gap-1.5 p-1.5 bg-indigo-50/50 rounded border border-indigo-100">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex gap-1.5">
                                                        <div className="flex-1">
                                                            <TextInput value={mf.key} onChange={(v) => updateMetaField(i, { ...mf, key: v })} placeholder="e.g. ticketId" />
                                                        </div>
                                                        <div className="w-20">
                                                            <SelectInput
                                                                value={mf.type}
                                                                onChange={(v) => updateMetaField(i, { ...mf, type: v as MetaFieldDefinition['type'] })}
                                                                options={META_TYPE_OPTIONS}
                                                            />
                                                        </div>
                                                    </div>
                                                    <TextInput
                                                        value={mf.description ?? ''}
                                                        onChange={(v) => updateMetaField(i, { ...mf, description: v || undefined })}
                                                        placeholder="Description (optional)"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="text-red-400 hover:text-red-600 mt-1"
                                                    onClick={() => setMetaFields((prev) => prev.filter((_, j) => j !== i))}
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Code snippet */}
                                    <div className="space-y-0.5 hidden">
                                        <span className="text-[10px] font-semibold text-gray-500">Usage example:</span>
                                        <pre className="text-[10px] bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre font-mono text-gray-600">
                                            {`// Page code provides the meta object
 const meta = {${(metaFields.length > 0 ? metaFields : [...(metaContract.usages.meta?.keys() ?? [])].map((k) => ({ key: k, type: 'string' as const })))
     .map((mf: { key: string; type: string }) => {
         const sample = mf.type === 'number' ? '0' : mf.type === 'boolean' ? 'true' : "''";
         return `\n  ${mf.key}: ${sample}`;
     })
     .join(',')}
 };

 // Scenario 1: Direct initial values (no fetch)
 const config = convertToRuntimeConfig(record, {
 initialValues: ticketData,
 meta,
 });

 // Scenario 2: Fetch initial values using meta
 const values = await fetchInitialValues(record, meta);
 const config = convertToRuntimeConfig(record, {
 initialValues: values,
 meta,  // also flows to async options
 });

 // Via DynamicFormRenderer
 <DynamicFormRenderer
 fields={form.fields}
 formName={form.name}
 meta={meta}
 />`}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/*  Field Editor Panel  */}
                <div className="w-1/2 min-w-75 flex flex-col">
                    {selectedIndex !== null && fields[selectedIndex] ? (
                        <FieldConfigPanel
                            key={selectedIndex}
                            field={fields[selectedIndex]}
                            allFieldNames={allFieldNames}
                            onChange={(updated) => updateField(selectedIndex, updated)}
                            onClose={() => setSelectedIndex(null)}
                            onJsonError={setJsonError}
                            isServiceNowForm={formType === 'servicenow'}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">Select a field to edit its properties</div>
                    )}
                </div>
            </div>

            {/* Footer: Save button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-2 flex flex-row justify-end items-center gap-1 z-10">
                {hasTemplateErrors && (
                    <div className="text-[10px] text-red-500 max-h-24 overflow-y-auto mb-1.5 flex flex-col gap-0.5 border border-red-100 rounded p-1.5 bg-red-50/30">
                        <span className="font-semibold text-right">Template & Configuration errors found:</span>
                        <ul className="list-disc list-inside text-left flex flex-col gap-0.5">
                            {/* Bare errors */}
                            {metaContract.hasBareErrors && (
                                <li className="truncate">Invalid placeholders (missing prefix): {[...metaContract.bareErrors].map((k) => `{${k}}`).join(', ')}</li>
                            )}
                            {/* JSON parse errors */}
                            {Object.entries(jsonInputErrors)
                                .filter(([_, err]) => err)
                                .map(([key]) => {
                                    const friendly =
                                        key === 'submit-bodyMapping'
                                            ? 'Submit bodyMapping'
                                            : key === 'submit-queryParams'
                                              ? 'Submit queryParams'
                                              : key === 'submit-bodyParams'
                                                ? 'Submit bodyParams'
                                                : key === 'iv-queryParams'
                                                  ? 'Initial Values queryParams'
                                                  : key === 'iv-bodyParams'
                                                    ? 'Initial Values bodyParams'
                                                    : key.replace('-ao-queryParams', ' async queryParams').replace('-ao-bodyParams', ' async bodyParams');
                                    return (
                                        <li key={key} className="truncate">
                                            Invalid JSON in {friendly}
                                        </li>
                                    );
                                })}
                            {/* Template syntax errors */}
                            {templateErrors.map((err, i) => (
                                <li key={i} className="truncate" title={err}>
                                    {err}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="flex justify-end gap-2 min-w-[20%]">
                    <FormActionButton
                        isSubmitting={isSubmitting}
                        onClick={handleSave}
                        label={mode === 'create' ? 'Create Form' : 'Update Form'}
                        submittingLabel="Saving..."
                        icon={<Save size={14} />}
                        variant={mode === 'create' ? 'brand' : 'brand'}
                        disabled={!code.trim() || !name.trim() || fields.length === 0 || hasTemplateErrors || (formType === 'servicenow' && !snowDictName)}
                    />
                </div>

                {isFormGod && mode === 'update' && onResetConfigToSeederLevel ? (
                    <div className="flex justify-end gap-2 min-w-[10%]">
                        <FormActionButton
                            isSubmitting={isResetingToSeeder ?? false}
                            onClick={onResetConfigToSeederLevel}
                            label={'Reset Config to Seeder version'}
                            submittingLabel="Reseting..."
                            icon={<BiReset size={14} />}
                            variant={'pill-green'}
                        />
                    </div>
                ) : null}

                {isFormGod && mode === 'update' && onDelete ? (
                    <div className="flex justify-end gap-2 min-w-[10%]">
                        <FormActionButton
                            isSubmitting={isDeleting ?? false}
                            onClick={onDelete}
                            label={'Deleting Form Config'}
                            submittingLabel="Delete..."
                            icon={<Trash2 size={14} />}
                            variant={'danger'}
                        />
                    </div>
                ) : null}
            </div>

            {/* Form Preview Modal */}
            <Modal open={showPreview} onClose={() => setShowPreview(false)} size="7xl" className="p-5">
                <Modal.Header>
                    <Eye size={14} className="text-gray-500" />
                    <h3 className="text-xs font-semibold text-gray-700">Previewing Form: {name || 'Untitled Form'}</h3>
                </Modal.Header>
                <Modal.Body>
                    {showPreview && (
                        <DynamicFormRenderer
                            record={{
                                id: '__preview__',
                                code,
                                name,
                                fields,
                                mode: formMode,
                                submitLabel: submitLabel || undefined,
                                submittingLabel: submittingLabel || undefined,
                                cancelLabel: cancelLabel || undefined,
                                trackDirty,
                                submitWithValues,
                                variant: undefined,
                                submitConfig,
                                initialValuesConfig,
                                submitGuards: buildSubmitGuards(guardNoChanges, guardConfirm),
                                submitGuardMessages: hasGuardMessages(guardMessages) ? guardMessages : undefined,
                                metaFields,
                                version: initial?.version ?? 1,
                            }}
                            meta={{
                                postId: 10,
                                ticketType: 'incident',
                                ticketId: '7f7e9079fb597e10dd3ffa656eefdcd5',
                                environment: 'prod',
                                productId: 1,
                            }}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Modal.ActionButton onClick={() => setShowPreview(false)} variant="secondary">
                        Close Preview
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* SNOW Dictionary Import Modal */}
            {showDictionaryImport && (
                <SnowDictionaryImport
                    existingFieldNames={allFieldNames}
                    dictName={formType === 'servicenow' ? snowDictName : ''}
                    onImport={handleDictionaryImport}
                    onClose={() => setShowDictionaryImport(false)}
                />
            )}
        </div>
    );
};

export default FormConfigEditor;
