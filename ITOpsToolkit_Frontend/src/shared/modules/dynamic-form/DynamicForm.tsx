import { useImperativeHandle, useMemo, type ReactNode } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { revalidateLogic } from '@tanstack/form-core';
import { Save, Trash2, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { getChangedFields } from '@/shared/utils/tanstack-form-utils';
import DynamicField from './DynamicField';
import type { FormConfig, FormImperativeHandle, FormMode, FormSubmitGuardType } from './types';
import { useFormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';
import logger from '@/shared/utils/logger';

/** Default submit guards per form mode */
const DEFAULT_SUBMIT_GUARDS: Record<FormMode, FormSubmitGuardType[]> = {
    create: ['confirm-before-submit'],
    update: ['no-changes', 'confirm-before-submit'],
    delete: ['confirm-before-submit'],
    view: [],
};

interface DynamicFormProps<TMode extends FormMode = FormMode> {
    formId: string;
    config: FormConfig<TMode>;
    isExternalLoading?: boolean;
    isExternalError?: boolean;
    externalError?: Error | null;
    isExternalErrorRetrying?: boolean;
    externalErrorRetry?: () => void;
    children?: ReactNode;
    /** Expose imperative methods (setFieldValue, getFieldValue, resetField, resetForm, submitForm) */
    formRef?: React.Ref<FormImperativeHandle>;
}

const submitVariant: Record<FormMode, 'brand' | 'primary' | 'danger'> = {
    create: 'brand',
    update: 'brand',
    delete: 'danger',
    view: 'brand',
};

function DynamicForm<TMode extends FormMode = FormMode>({
    formId,
    config,
    isExternalLoading,
    isExternalError,
    isExternalErrorRetrying,
    externalError,
    externalErrorRetry,
    children,
    formRef,
}: DynamicFormProps<TMode>) {
    const validationLogic = useMemo(() => revalidateLogic(), []);

    // Exclude hidden fields entirely and sort by order property
    const activeFields = useMemo(() => {
        return config.fields.filter((f) => !f.hidden).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [config.fields]);

    const defaultValues = useMemo(() => {
        const values: Record<string, unknown> = {};
        for (const field of activeFields) {
            switch (field.type) {
                case 'multiselect':
                    values[field.name] = [];
                    break;
                case 'checkbox':
                    values[field.name] = false;
                    break;
                case 'date-range':
                    values[field.name] = [undefined, undefined];
                    break;
                default:
                    values[field.name] = '';
            }
        }
        if (config.initialValues) {
            Object.assign(values, config.initialValues);
        }
        for (const field of activeFields) {
            if (field.defaultValue !== undefined) {
                values[field.name] = field.defaultValue;
            }
        }
        return values;
    }, [activeFields, config.initialValues]);

    const shouldValidate = config.mode === 'create' || config.mode === 'update';

    // `[]` = explicitly no guards (user disabled them). `undefined` = use per-mode defaults.
    const resolvedGuards = Array.isArray(config.submitGuards) ? config.submitGuards : DEFAULT_SUBMIT_GUARDS[config.mode];
    const guardMessages = config.submitGuardMessages;

    // guardedOnSubmit is lazy - formInstance.store.state.values is only read at call time
    const { guardedOnSubmit } = useFormSubmitGuard<Record<string, unknown>, { message?: string }>({
        getValues: () => formInstance.store.state.values,
        defaultValues,
        submitWithValues: config.submitWithValues ?? 'all-values',
        guards: resolvedGuards,
        noChangesTitle: guardMessages?.noChangesTitle,
        noChangesNote: guardMessages?.noChangesMessage,
        confirmTitle: guardMessages?.confirmTitle,
        confirmMessage: guardMessages?.confirmMessage,
        confirmProceedLabel: guardMessages?.confirmProceedLabel,
        confirmDiscardLabel: guardMessages?.confirmDiscardLabel,
        onSubmit: async (payload) => {
            const result = await config.onSubmit(payload);
            if (config.onSubmitSuccess) {
                await config.onSubmitSuccess(payload, result?.message ?? 'Success', result?.responseData);
            }
            return result;
        },
    });

    const formInstance = useForm({
        formId,
        defaultValues,
        validationLogic: shouldValidate ? validationLogic : undefined,
        onSubmit: async ({ value }) => {
            logger.debug('Form submitted with values:', value);
            await guardedOnSubmit();
        },
        listeners: config.trackDirty
            ? {
                  onChange: ({ formApi }: { formApi: { state: { values: Record<string, unknown> } } }) => {
                      const changed = getChangedFields(formApi.state.values, defaultValues);
                      config.onDirtyChange?.(changed.length > 0);
                  },
              }
            : undefined,
    });

    useImperativeHandle(formRef, () => ({
        setFieldValue: (field: string, value: unknown) => formInstance.setFieldValue(field as never, value as never),
        getFieldValue: (field: string) => formInstance.getFieldValue(field as never),
        resetField: (field: string) => formInstance.resetField(field as never),
        resetForm: () => formInstance.reset(),
        submitForm: () => formInstance.handleSubmit(),
    }));

    const allValues = useStore(formInstance.store, (s) => s.values);
    const isSubmitting = useStore(formInstance.store, (s) => s.isSubmitting);

    const submitLabel = config.submitLabel ?? (config.mode === 'delete' ? 'Delete' : 'Submit');
    const submittingLabel = config.submittingLabel ?? (config.mode === 'delete' ? 'Deleting...' : 'Submitting...');

    const cn = config.classNames;

    return (
        <form
            className={twMerge('relative flex flex-col h-full w-full', cn?.form)}
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formInstance.handleSubmit();
            }}
        >
            {isExternalLoading && <LoadingPlaceholder overlay />}
            {isSubmitting && <LoadingPlaceholder overlay message="Submitting..." />}
            {isExternalError && <ErrorPlaceholder iconSize={100} overlay error={externalError} isRefetching={isExternalErrorRetrying} onRetry={externalErrorRetry} />}

            <div className="flex-1 overflow-y-auto">
                <div className={twMerge('grid grid-cols-2 gap-x-3 gap-y-2 p-4', cn?.fieldGrid)}>
                    {activeFields.map((field) => (
                        <DynamicField
                            key={field.name}
                            fieldConfig={field}
                            formInstance={formInstance as never}
                            allValues={allValues}
                            mode={config.mode}
                            isSubmitting={isSubmitting}
                            isFieldDisabled={config.isFieldDisabled as never}
                            classNames={cn}
                            variant={config.variant}
                        />
                    ))}
                </div>
                {children}
            </div>

            {config.mode !== 'view' && (
                <div className={twMerge('bottom-0 z-10 bg-white border-t border-gray-200 px-3 py-2 flex justify-center gap-3', cn?.submitFooter)}>
                    {config.onCancel && (
                        <FormActionButton
                            isSubmitting={false}
                            onClick={async () => {
                                await config.onCancel?.();
                                await config.onCancelSuccess?.();
                            }}
                            label={config.cancelLabel ?? 'Cancel'}
                            submittingLabel={config.cancelLabel ?? 'Cancel'}
                            icon={<X size={14} />}
                            variant="secondary"
                            className={cn?.cancelButton}
                            disabled={isSubmitting || isExternalLoading || isExternalErrorRetrying || isExternalError}
                        />
                    )}
                    <FormActionButton
                        isSubmitting={isSubmitting}
                        onClick={() => formInstance.handleSubmit()}
                        label={submitLabel}
                        submittingLabel={submittingLabel}
                        icon={config.mode === 'delete' ? <Trash2 size={14} /> : <Save size={14} />}
                        variant={submitVariant[config.mode]}
                        className={cn?.submitButton}
                        disabled={isSubmitting || isExternalLoading || isExternalErrorRetrying || isExternalError}
                    />
                </div>
            )}
        </form>
    );
}

export default DynamicForm;
