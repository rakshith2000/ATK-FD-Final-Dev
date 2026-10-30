import { resolveFieldDisabled } from '@/shared/utils/resolve-field-disabled';
import type { FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import { FormField, TextInput, SelectInput, MultiSelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { useForm, useStore } from '@tanstack/react-form';
import { Save, Trash2, Eye } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import z from 'zod';
import type { FormMode } from '@/shared/types/form';
import { requiredString512Chars } from '@/shared/utils/zod-schemas';
import type { UpdateToolkitPackageConfigRequest } from '../../../types/prompt-library';
import { useUpdateToolkitPackageConfigMutation } from '../../../hooks/useUpdateToolkitPackageConfigMutation';
import type { OverlayState } from '@/shared/components/ui/FormActionModal/FormActionModal';
import { useLLMTagOptionsQuery } from '@/modules/admin-portal/modules/llms/hooks/useLLMTagOptionsQuery';
import { useITSMConnectorTagOptionsQuery } from '@/modules/admin-portal/modules/itsm-connectors/hooks/useITSMConnectorTagOptionsQuery';
import logger from '@/shared/utils/logger';
import llmGuardsOptions from '../../../contants/llm-guards-options';
import { twMerge } from 'tailwind-merge';
import { useFormSubmitGuard, type FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';

// Types
interface UpdateToolkitPackageConfigFormProps {
    className?: string;
    mode?: FormMode;
    isConfigLoading?: boolean;
    isConfigLoadingError?: boolean;
    configLoadingError?: Error | null;
    onRetryConfigQuery?: () => void;
    isConfigRetrying?: boolean;
    initialValues?: Partial<UpdateToolkitPackageConfigRequest>;
    onSubmitSuccess?: (data: { formDataWhileSubmitting: UpdateToolkitPackageConfigRequest; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<FormMode>) => boolean | undefined;
    setOverlay?: (state: OverlayState) => void;
    setCanClose?: (canClose: boolean) => void;
}

// Schema
const updateToolkitPackageConfigSchema = z.object({
    package_name: requiredString512Chars('Package name is required'),
    llm_tag: requiredString512Chars('LLM tag is required'),
    llm_guards: z.array(z.string()).min(1, 'At least one LLM guard must be selected'),
    itsm_tags: z.array(z.string()).min(1, 'At least one ITSM tag is required'),
});

// Submit config per mode
const submitConfig: Record<FormMode, { label: string; submittingLabel: string; icon: React.ReactNode; className?: string }> = {
    create: { label: '', submittingLabel: '', icon: <Save size={14} /> },
    update: { label: 'Update Configuration', submittingLabel: 'Updating...', icon: <Save size={14} /> },
    delete: { label: '', submittingLabel: '', icon: <Trash2 size={14} /> },
    view: { label: 'Package Config Details', submittingLabel: 'Close', icon: <Eye size={14} /> },
};

// Standard variant styling
const standardInputClassName =
    'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] placeholder:text-[var(--brand-text-muted-color)] disabled:text-[var(--brand-text-gray)]';
const standardSelectTriggerClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const standardMultiSelectTriggerClassName = 'min-h-[25px] h-auto text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.7rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

// Component
const UpdateToolkitPackageConfigForm: React.FC<UpdateToolkitPackageConfigFormProps> = ({
    className,
    mode = 'update',
    initialValues,
    onSubmitSuccess,
    isFieldDisabled,
    configLoadingError,
    isConfigLoading,
    isConfigLoadingError,
    onRetryConfigQuery,
    setOverlay,
    setCanClose,
}) => {
    logger.debug('UpdateToolkitPackageConfigForm - Rendered with props:', { mode, initialValues });

    const updateMutation = useUpdateToolkitPackageConfigMutation();
    const llmTagOptionsQuery = useLLMTagOptionsQuery();
    const itsmConnectorTagsQuery = useITSMConnectorTagOptionsQuery();

    const { guardedOnSubmit } = useFormSubmitGuard<z.infer<typeof updateToolkitPackageConfigSchema>, { message?: string }>({
        getValues: () => formInstance.store.state.values as z.infer<typeof updateToolkitPackageConfigSchema>,
        defaultValues: (initialValues ?? {}) as z.infer<typeof updateToolkitPackageConfigSchema>,
        guards: (mode === 'update' ? ['no-changes', 'confirm-before-submit'] : ['confirm-before-submit']) satisfies FormSubmitGuard[],
        submitWithValues: 'all-values',
        confirmTitle: 'Are you sure?',
        confirmMessage: 'Upating the package configuration may affect the behavior of agents or tools using this configuration. Do you want to proceed?',
        confirmProceedLabel: mode === 'delete' ? 'Yes, delete it' : 'Yes, proceed',
        confirmDiscardLabel: 'No, keep editing',
        onSubmit: async (value) => {
            const data = value as z.infer<typeof updateToolkitPackageConfigSchema>;
            const response = await updateMutation.mutateAsync({ payload: data });
            return { message: response?.message ?? '' };
        },
    });

    const formInstance = useForm({
        defaultValues: {
            package_name: initialValues?.package_name ?? '',
            llm_tag: initialValues?.llm_tag ?? '',
            llm_guards: initialValues?.llm_guards ?? [],
            itsm_tags: initialValues?.itsm_tags ?? [],
        },
        validators: {
            onSubmit: ['create', 'update'].includes(mode) ? updateToolkitPackageConfigSchema : undefined,
            onChange: ['create', 'update'].includes(mode) ? updateToolkitPackageConfigSchema : undefined,
        },
        onSubmit: async ({ value }) => {
            logger.debug('Form submitted with value:', value);

            const response = await guardedOnSubmit();

            if (response === undefined) return;

            await onSubmitSuccess?.({
                formDataWhileSubmitting: value,
                message: response?.message ?? '',
            });

            formInstance.reset();
        },
    });

    const isSubmissionInProgress = useStore(formInstance.store, (s) => s.isSubmitting);

    const getDisabled = useCallback(
        (fieldName: string, value: unknown, canEdit?: boolean) =>
            resolveFieldDisabled<FormMode>({
                fieldName,
                mode,
                value,
                canEdit,
                isSubmissionInProgress,
                isFieldDisabled,
            }),
        [mode, isSubmissionInProgress, isFieldDisabled],
    );

    const { label, submittingLabel, icon, className: submitClassName } = submitConfig[mode];

    const isLoading = llmTagOptionsQuery.isPending || itsmConnectorTagsQuery.isPending;
    const isError = llmTagOptionsQuery.isError || itsmConnectorTagsQuery.isError;
    const error = llmTagOptionsQuery.error || itsmConnectorTagsQuery.error;

    const handleRetry = () => {
        llmTagOptionsQuery.refetch();
        itsmConnectorTagsQuery.refetch();
    };

    const combinedIsLoading = isLoading || !!isConfigLoading;
    const combinedIsError = (isError || !!isConfigLoadingError) && !combinedIsLoading;
    const combinedError = error || configLoadingError || null;
    const combinedRetry = () => {
        handleRetry();
        onRetryConfigQuery?.();
    };

    useEffect(() => {
        setOverlay?.({ isLoading: combinedIsLoading || isSubmissionInProgress, isError: combinedIsError, error: combinedError, onRetry: combinedRetry });
        if (isSubmissionInProgress) {
            setCanClose?.(false);
        } else {
            setCanClose?.(true);
        }
    }, [combinedIsLoading, combinedIsError, combinedError, isSubmissionInProgress]);

    return (
        <form className={twMerge('relative flex h-full w-full flex-col overflow-hidden', className)}>
            <div className="flex-1 min-h-0 overflow-y-auto mt-3">
                <div className="flex flex-col gap-3 px-3 pb-3 pt-3">
                    {/* Package Name */}
                    <formInstance.Field name="package_name">
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="Package Name"
                                required
                                disabled={getDisabled('package_name', field.state.value, mode === 'update')}
                                labelClassName={labelClassName}
                                errorClassName={errorClassName}
                                errorMinHeight={0}
                            >
                                {({ value, onChange, onBlur, onFocus, disabled, id }) => (
                                    <TextInput
                                        id={id}
                                        value={value as string}
                                        onChange={onChange}
                                        onBlur={onBlur}
                                        onFocus={onFocus}
                                        disabled={disabled}
                                        name="package_name"
                                        placeholder="e.g. train_assist"
                                        className={standardInputClassName}
                                        data-field="package_name"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    {/* LLM Tag */}
                    <formInstance.Field name="llm_tag">
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="LLM Tag"
                                required
                                disabled={getDisabled('llm_tag', field.state.value, mode === 'update')}
                                labelClassName={labelClassName}
                                errorClassName={errorClassName}
                                errorMinHeight={5}
                            >
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <SelectInput
                                        value={value as string}
                                        onChange={onChange as (v: string) => void}
                                        onBlur={onBlur}
                                        error={hasError || llmTagOptionsQuery.isError}
                                        disabled={disabled}
                                        options={llmTagOptionsQuery.data ?? []}
                                        isLoading={llmTagOptionsQuery.isFetching}
                                        errorMessage={llmTagOptionsQuery.isError ? (llmTagOptionsQuery.error?.message ?? 'Failed to load options') : undefined}
                                        onRetry={llmTagOptionsQuery.isError ? () => llmTagOptionsQuery.refetch() : undefined}
                                        onRefetch={() => llmTagOptionsQuery.refetch()}
                                        placeholder="e.g. azure_gpt4o"
                                        triggerClassName={standardSelectTriggerClassName}
                                        data-field="llm_tag"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    {/* LLM Guards */}
                    <formInstance.Field name="llm_guards">
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="LLM Guards"
                                required
                                disabled={getDisabled('llm_guards', field.state.value, mode === 'update')}
                                labelClassName={labelClassName}
                                errorClassName={errorClassName}
                                errorMinHeight={5}
                            >
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <MultiSelectInput
                                        value={value as string[]}
                                        onChange={onChange as (v: string[]) => void}
                                        onBlur={onBlur}
                                        error={hasError}
                                        disabled={disabled}
                                        options={llmGuardsOptions}
                                        placeholder="Add LLM guards"
                                        maxChips={5}
                                        triggerClassName={standardMultiSelectTriggerClassName}
                                        data-field="llm_guards"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    {/* ITSM Tags */}
                    <formInstance.Field name="itsm_tags">
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="ITSM Tags"
                                required
                                disabled={getDisabled('itsm_tags', field.state.value, mode === 'update')}
                                labelClassName={labelClassName}
                                errorClassName={errorClassName}
                                errorMinHeight={5}
                            >
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <MultiSelectInput
                                        value={value as string[]}
                                        onChange={onChange as (v: string[]) => void}
                                        onBlur={onBlur}
                                        error={hasError || itsmConnectorTagsQuery.isError}
                                        disabled={disabled}
                                        options={itsmConnectorTagsQuery.data ?? []}
                                        isLoading={itsmConnectorTagsQuery.isFetching}
                                        errorMessage={itsmConnectorTagsQuery.isError ? (itsmConnectorTagsQuery.error?.message ?? 'Failed to load options') : undefined}
                                        onRetry={itsmConnectorTagsQuery.isError ? () => itsmConnectorTagsQuery.refetch() : undefined}
                                        onRefetch={() => itsmConnectorTagsQuery.refetch()}
                                        placeholder="Add ITSM tags"
                                        maxChips={5}
                                        triggerClassName={standardMultiSelectTriggerClassName}
                                        data-field="itsm_tags"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>
                </div>
            </div>

            {/* Footer */}
            {mode === 'view' ? null : (
                <div className="shrink-0 bg-white flex items-center justify-end brand-box-show-inset border-t border-(--brand-border-color) px-3 py-2">
                    <formInstance.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                        {({ isSubmitting, canSubmit }) => (
                            <FormActionButton
                                isSubmitting={isSubmitting}
                                disabled={!canSubmit || isSubmitting}
                                onClick={formInstance.handleSubmit}
                                label={label}
                                submittingLabel={submittingLabel}
                                icon={icon}
                                className={submitClassName}
                                {...(mode === 'delete' ? { variant: 'danger' as const } : {})}
                                {...(mode === 'update' ? { variant: 'brand' as const } : {})}
                                {...(mode === 'create' ? { variant: 'brand' as const } : {})}
                            />
                        )}
                    </formInstance.Subscribe>
                </div>
            )}
        </form>
    );
};

export default UpdateToolkitPackageConfigForm;
