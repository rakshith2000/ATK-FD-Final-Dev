import type { FC } from 'react';
import type { AnyFieldApi } from '@tanstack/react-form';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { resolveFieldDisabled } from '@/shared/utils/resolve-field-disabled';
import { hasFieldTemplates, resolveTemplate } from '@/modules/admin-portal/modules/form-builder/utils/convert-to-runtime-config';
import { FormField } from '@/shared/components/ui/InputFields';
import { useFieldOptions } from './useFieldOptions';
import TextField from './fields/TextField';
import NumberField from './fields/NumberField';
import CheckboxField from './fields/CheckboxField';
import DateField from './fields/DateField';
import DateRangeField from './fields/DateRangeField';
import NumberRangeField from './fields/NumberRangeField';
import PasswordField from './fields/PasswordField';
import SelectField from './fields/SelectField';
import MultiSelectField from './fields/MultiSelectField';
import type { FieldConfig, FieldValidation, FormClassNames, FormMode, InputVariant } from './types';
import { buildFieldValidator } from './buildFieldValidator';

/** Resolve active validation by merging static + conditional rules.
 *  Both static and conditional run together. */
function resolveActiveValidation(field: FieldConfig, allValues: Record<string, unknown>): FieldValidation | undefined {
    const merged: FieldValidation = {};

    // Apply static rules
    if (field.validation) {
        Object.assign(merged, field.validation);
    }

    // Merge in matching conditional rules
    if (field.conditionalValidation) {
        for (const cv of field.conditionalValidation) {
            const dep = cv.when;
            const applies = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
            if (applies) {
                Object.assign(merged, cv.rules);
            }
        }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFormInstance = any;

interface DynamicFieldProps {
    fieldConfig: FieldConfig;
    formInstance: AnyFormInstance;
    allValues: Record<string, unknown>;
    mode: FormMode;
    isSubmitting: boolean;
    isFieldDisabled?: (info: { fieldName: string; mode: FormMode; value: unknown }) => boolean | undefined;
    classNames?: FormClassNames;
    variant?: InputVariant;
}

/** Resolve {field:key} templates at render time using current form values */
function resolveFieldTemplates(value: string, allValues: Record<string, unknown>): string {
    if (!hasFieldTemplates(value)) return value;
    return resolveTemplate(value, { field: allValues });
}

const DynamicField: FC<DynamicFieldProps> = ({ fieldConfig, formInstance, allValues, mode, isSubmitting, isFieldDisabled, classNames: cn, variant = 'standard' }) => {
    // Step 0: if hidden, skip rendering entirely
    if (fieldConfig.hidden) return null;

    // Step 1: evaluate visibleWhen (single-field or multi-field)
    if (fieldConfig.visibleWhen) {
        const dep = fieldConfig.visibleWhen;
        const visible = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
        if (!visible) return null;
    }

    // Step 1b: resolve active validation rules (static + conditional merged)
    const activeValidation = resolveActiveValidation(fieldConfig, allValues);

    // Step 2: evaluate disabledWhen (single-field or multi-field)
    let conditionDisabled = false;
    if (fieldConfig.disabledWhen) {
        const dep = fieldConfig.disabledWhen;
        conditionDisabled = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
    }

    // Step 3: get dependencyValue for asyncOptions (single or multi dependsOn)
    const { dependsOn } = fieldConfig.asyncOptions ?? {};
    const dependencyValue = !dependsOn ? undefined : Array.isArray(dependsOn) ? dependsOn.map((key) => allValues[key]) : allValues[dependsOn];

    // Step 4: useFieldOptions (called unconditionally)
    const {
        options,
        isLoading: isOptionsLoading,
        isError: isOptionsError,
        error: optionsError,
        optionsAsync,
        optionsAsyncDebounce,
        refetch: refetchOptions,
        triggerFetch,
    } = useFieldOptions(fieldConfig, dependencyValue);

    // Resolve disabled state
    const fieldDisabled =
        resolveFieldDisabled({
            fieldName: fieldConfig.name,
            mode,
            value: allValues[fieldConfig.name],
            isSubmissionInProgress: isSubmitting,
            isFieldDisabled,
        }) ||
        conditionDisabled ||
        !!fieldConfig.disabled;

    return (
        <div className={`${fieldConfig.colSpan === 2 ? 'col-span-2' : 'col-span-1'}${cn?.fieldWrapper ? ` ${cn.fieldWrapper}` : ''}`}>
            <formInstance.Field
                name={fieldConfig.name}
                asyncDebounceMs={fieldConfig.asyncValidation?.debounceMs ?? 500}
                validators={{
                    onDynamic: buildFieldValidator(fieldConfig, () => allValues),
                    ...(fieldConfig.asyncValidation
                        ? {
                              onDynamicAsync: async ({ value }: { value: unknown }) => {
                                  return await fieldConfig.asyncValidation!.validate(value, allValues);
                              },
                          }
                        : {}),
                }}
                listeners={
                    fieldConfig.onChange
                        ? {
                              onChange: (props: { value: unknown }) => {
                                  fieldConfig.onChange!(props.value, formInstance);
                              },
                          }
                        : undefined
                }
            >
                {(field: AnyFieldApi) => {
                    // Step 6: read errors from onDynamic / onDynamicAsync validators
                    const errorMap = field.state.meta.errorMap as Record<string, unknown>;

                    const extractMessage = (err: unknown): string | undefined => {
                        if (!err) return undefined;
                        if (typeof err === 'string') return err;
                        if (typeof err === 'object' && err !== null && 'message' in err) {
                            return (err as { message: string }).message;
                        }
                        return String(err);
                    };

                    const syncError = extractMessage(errorMap?.onDynamic);
                    const asyncError = extractMessage(errorMap?.onDynamicAsync);
                    const errorStr = syncError ?? asyncError;

                    const isCheckbox = fieldConfig.type === 'checkbox';
                    const isValidating = field.state.meta.isValidating;

                    // Resolve required: static OR conditional (requiredWhen)
                    let isRequired = !!fieldConfig.required;
                    if (!isRequired && fieldConfig.requiredWhen) {
                        const dep = fieldConfig.requiredWhen;
                        isRequired = 'fields' in dep ? dep.condition(allValues) : dep.condition(allValues[dep.field], allValues);
                    }

                    // Resolve {field:key} templates in label/placeholder at render time
                    const resolvedLabel = resolveFieldTemplates(fieldConfig.label, allValues);
                    const resolvedPlaceholder = fieldConfig.placeholder ? resolveFieldTemplates(fieldConfig.placeholder, allValues) : fieldConfig.placeholder;

                    const baseProps = {
                        value: field.state.value,
                        onChange: (v: unknown) => field.handleChange(v as never),
                        onBlur: field.handleBlur,
                        label: resolvedLabel,
                        placeholder: resolvedPlaceholder,
                        required: isRequired,
                        disabled: fieldDisabled,
                        error: errorStr,
                        name: fieldConfig.name,
                        rows: fieldConfig?.textAreaRows,
                    };

                    // Checkbox: simple wrapper (CheckboxInput handles its own label)
                    if (isCheckbox) {
                        const errorCls = `text-[10px] text-red-500 mt-0.5${cn?.error ? ` ${cn.error}` : ''}`;
                        return (
                            <div>
                                <CheckboxField {...baseProps} inputClassName={cn?.checkboxInput} checkboxLabelClassName={cn?.checkboxLabel} />
                                {errorStr && <p className={errorCls}>{errorStr}</p>}
                            </div>
                        );
                    }

                    // All other fields: wrapped in FormField for variant support
                    return (
                        <FormField
                            value={field.state.value}
                            onChange={(v) => field.handleChange(v as never)}
                            onBlur={field.handleBlur}
                            label={isValidating ? undefined : resolvedLabel}
                            required={isRequired}
                            disabled={fieldDisabled}
                            variant={variant}
                            error={!!errorStr}
                            errorText={errorStr}
                            labelClassName={cn?.label}
                            errorClassName={cn?.error}
                            fieldsetClassName={cn?.fieldset}
                        >
                            {({ inputClassName: variantInputClassName, isFloating, onFocus, onBlur }) => {
                                // Validating indicator rendered as custom label when async validation is running
                                const validatingLabel = isValidating ? (
                                    <div className="flex items-center justify-between mb-0.5">
                                        <label className={`text-xs font-medium text-gray-700${cn?.label ? ` ${cn.label}` : ''}`}>
                                            {resolvedLabel}
                                            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
                                        </label>
                                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <Loader2 size={10} className="animate-spin" />
                                            Validating...
                                        </span>
                                    </div>
                                ) : null;

                                // For outlined/filled, only show placeholder when label is floating
                                const effectivePlaceholder = variant === 'standard' ? resolvedPlaceholder : isFloating ? resolvedPlaceholder : '';

                                // Merge variant inputClassName (e.g. border-0 for outlined) with user's custom input class
                                const inputClassName = twMerge(variantInputClassName, cn?.input);

                                const handleFocus = () => {
                                    onFocus?.();
                                    triggerFetch?.();
                                };

                                const fieldProps = {
                                    ...baseProps,
                                    onBlur,
                                    onFocus: handleFocus,
                                    placeholder: effectivePlaceholder,
                                    inputClassName,
                                };

                                let fieldElement: React.ReactNode;

                                switch (fieldConfig.type) {
                                    case 'text':
                                        fieldElement = <TextField {...fieldProps} maxLength={activeValidation?.maxLength} />;
                                        break;
                                    case 'password':
                                        fieldElement = <PasswordField {...fieldProps} maxLength={activeValidation?.maxLength} />;
                                        break;
                                    case 'textarea':
                                        fieldElement = <TextField {...fieldProps} multiline maxLength={activeValidation?.maxLength} textareaClassName={cn?.textarea} />;
                                        break;
                                    case 'number':
                                        fieldElement = <NumberField {...fieldProps} min={activeValidation?.min} max={activeValidation?.max} />;
                                        break;
                                    case 'date':
                                        fieldElement = <DateField {...fieldProps} triggerClassName={cn?.selectTrigger} />;
                                        break;
                                    case 'datetime':
                                        fieldElement = <DateField {...fieldProps} triggerClassName={cn?.selectTrigger} time />;
                                        break;
                                    case 'date-range':
                                        fieldElement = <DateRangeField {...fieldProps} triggerClassName={cn?.selectTrigger} />;
                                        break;
                                    case 'number-range':
                                        fieldElement = <NumberRangeField {...fieldProps} min={activeValidation?.min} max={activeValidation?.max} />;
                                        break;
                                    case 'select':
                                        fieldElement = (
                                            <SelectField
                                                {...{ ...fieldProps, inputClassName: '' }}
                                                options={options}
                                                isLoading={isOptionsLoading}
                                                errorMessage={isOptionsError && optionsError ? optionsError.message || 'Failed to load options' : undefined}
                                                onRetry={refetchOptions}
                                                onRefetch={refetchOptions}
                                                triggerClassName={cn?.selectTrigger}
                                                optionsAsync={optionsAsync}
                                                optionsAsyncDebounce={optionsAsyncDebounce}
                                            />
                                        );
                                        break;
                                    case 'multiselect':
                                        fieldElement = (
                                            <MultiSelectField
                                                {...{ ...fieldProps, inputClassName: '' }}
                                                options={options}
                                                isLoading={isOptionsLoading}
                                                errorMessage={isOptionsError && optionsError ? optionsError.message || 'Failed to load options' : undefined}
                                                onRetry={refetchOptions}
                                                onRefetch={refetchOptions}
                                                triggerClassName={cn?.selectTrigger}
                                                chipClassName={cn?.chip}
                                                chipDeleteClassName={cn?.chipDelete}
                                                optionsAsync={optionsAsync}
                                                optionsAsyncDebounce={optionsAsyncDebounce}
                                            />
                                        );
                                        break;
                                    default:
                                        fieldElement = null;
                                }

                                return (
                                    <>
                                        {validatingLabel}
                                        {fieldElement}
                                    </>
                                );
                            }}
                        </FormField>
                    );
                }}
            </formInstance.Field>
        </div>
    );
};

export default DynamicField;
