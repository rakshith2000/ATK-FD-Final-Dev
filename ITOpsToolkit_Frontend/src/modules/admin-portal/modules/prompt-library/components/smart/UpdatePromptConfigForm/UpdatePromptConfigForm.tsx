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
import type { UpdatePromptConfigRequest } from '../../../types/prompt-library';
import { useUpdatePromptConfigMutation } from '../../../hooks/useUpdatePromptConfigMutation';
import type { OverlayState } from '@/shared/components/ui/FormActionModal/FormActionModal';
import { useLLMTagOptionsQuery } from '@/modules/admin-portal/modules/llms/hooks/useLLMTagOptionsQuery';
import { useITSMConnectorTagOptionsQuery } from '@/modules/admin-portal/modules/itsm-connectors/hooks/useITSMConnectorTagOptionsQuery';
import logger from '@/shared/utils/logger';
import { useFormSubmitGuard, type FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';

// Types
interface UpdatePromptConfigFormProps {
    mode?: FormMode;
    initialValues?: Partial<UpdatePromptConfigRequest>;
    onSubmitSuccess?: (data: { formDataWhileSubmitting: UpdatePromptConfigRequest; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<FormMode>) => boolean | undefined;
    setOverlay?: (state: OverlayState) => void;
    setCanClose?: (canClose: boolean) => void;
}

// Schema
const updatePromptConfigSchema = z.object({
    package_name: requiredString512Chars('Package name is required'),
    agent_or_tool_name: requiredString512Chars('Agent or tool name is required'),
    description: requiredString512Chars('Description is required'),
    instruction: z.string().min(1, 'Instruction is required'),
    llm_tag: z.string().nullable(),
    itsm_tags: z.array(z.string()).nullable(),
});

// Submit config per mode
const submitConfig: Record<FormMode, { label: string; submittingLabel: string; icon: React.ReactNode; className?: string }> = {
    create: { label: '', submittingLabel: '', icon: <Save size={14} /> },
    update: { label: 'Update Prompt Config', submittingLabel: 'Updating...', icon: <Save size={14} /> },
    delete: { label: '', submittingLabel: '', icon: <Trash2 size={14} /> },
    view: { label: 'Prompt Config Details', submittingLabel: 'Close', icon: <Eye size={14} /> },
};

const inputClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const selectTriggerClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const multiSelectTriggerClassName = 'min-h-[25px] h-auto text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.7rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

// Component
const UpdatePromptConfigForm: React.FC<UpdatePromptConfigFormProps> = ({ mode = 'update', initialValues, onSubmitSuccess, isFieldDisabled, setOverlay, setCanClose }) => {
    logger.debug('UpdatePromptConfigForm - Rendered with props:', { mode, initialValues });
    const updateMutation = useUpdatePromptConfigMutation();

    const llmTagOptionsQuery = useLLMTagOptionsQuery();
    const itsmConnectorTagsQuery = useITSMConnectorTagOptionsQuery();

    const { guardedOnSubmit } = useFormSubmitGuard<z.infer<typeof updatePromptConfigSchema>, { message?: string }>({
        getValues: () => formInstance.store.state.values as z.infer<typeof updatePromptConfigSchema>,
        defaultValues: (initialValues ?? {}) as z.infer<typeof updatePromptConfigSchema>,
        guards: (mode === 'update' ? ['no-changes', 'confirm-before-submit'] : ['confirm-before-submit']) satisfies FormSubmitGuard[],
        submitWithValues: 'all-values',
        confirmTitle: 'Are you sure?',
        confirmMessage: 'Upating the prompt configuration may affect the behavior of agents or tools using this configuration. Do you want to proceed?',
        confirmProceedLabel: mode === 'delete' ? 'Yes, delete it' : 'Yes, proceed',
        confirmDiscardLabel: 'No, keep editing',
        onSubmit: async (value) => {
            logger.debug({ value });
            const data = value as z.infer<typeof updatePromptConfigSchema>;
            const payload = {
                ...data,
                llm_tag: data.llm_tag ?? null,
                itsm_tags: data.itsm_tags ?? null,
            };

            const response = await updateMutation.mutateAsync({ payload });
            return { message: response?.message ?? '' };
        },
    });

    const formInstance = useForm({
        defaultValues: {
            package_name: initialValues?.package_name ?? '',
            agent_or_tool_name: initialValues?.agent_or_tool_name ?? '',
            description: initialValues?.description ?? '',
            instruction: initialValues?.instruction ?? '',
            llm_tag: initialValues?.llm_tag ?? null,
            itsm_tags: initialValues?.itsm_tags ?? null,
        },
        validators: {
            onSubmit: ['create', 'update'].includes(mode) ? updatePromptConfigSchema : undefined,
            onChange: ['create', 'update'].includes(mode) ? updatePromptConfigSchema : undefined,
        },
        onSubmit: async ({ value }) => {
            const response = await guardedOnSubmit();

            if (response === undefined) return;

            await onSubmitSuccess?.({
                formDataWhileSubmitting: value,
                message: response.message ?? '',
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

    const isLoading = llmTagOptionsQuery.isPending || itsmConnectorTagsQuery.isPending || isSubmissionInProgress;
    const isError = llmTagOptionsQuery.isError || itsmConnectorTagsQuery.isError;
    const error = llmTagOptionsQuery.error || itsmConnectorTagsQuery.error;
    const handleRetry = () => {
        llmTagOptionsQuery.refetch();
        itsmConnectorTagsQuery.refetch();
    };

    useEffect(() => {
        setOverlay?.({ isLoading, isError, error, onRetry: handleRetry });
        if (isSubmissionInProgress) {
            setCanClose?.(false);
        } else {
            setCanClose?.(true);
        }
    }, [isLoading, isError, error, isSubmissionInProgress]);

    return (
        <form className="relative flex h-full w-full flex-col">
            <div className="relative flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1 p-4">
                    <div className="mt-5 flex flex-col gap-2">
                        <div className="mt-1 flex flex-col lg:flex-row gap-4">
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
                                                placeholder="e.g. train_assist"
                                                className={inputClassName}
                                                data-field="package_name"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            {/* Agent or Tool Name */}
                            <formInstance.Field name="agent_or_tool_name">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Prompt Identifier"
                                        required
                                        disabled={getDisabled('agent_or_tool_name', field.state.value, mode === 'update')}
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
                                                placeholder="e.g. quiz_generation_agent"
                                                className={inputClassName}
                                                data-field="agent_or_tool_name"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>

                        {/* LLM Tag */}
                        <formInstance.Field name="llm_tag">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="LLM Tag"
                                    disabled={getDisabled('llm_tag', field.state.value, mode === 'update')}
                                    labelClassName={labelClassName}
                                    errorClassName={errorClassName}
                                    errorMinHeight={0}
                                >
                                    {({ value, onChange, onBlur, hasError, disabled }) => (
                                        <SelectInput
                                            value={(value as string) ?? null}
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
                                            triggerClassName={selectTriggerClassName}
                                            data-field="llm_tag"
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
                                    disabled={getDisabled('itsm_tags', field.state.value, mode === 'update')}
                                    labelClassName={labelClassName}
                                    errorClassName={errorClassName}
                                    errorMinHeight={0}
                                >
                                    {({ value, onChange, onBlur, hasError, disabled }) => (
                                        <MultiSelectInput
                                            value={(value as string[]) || null}
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
                                            triggerClassName={multiSelectTriggerClassName}
                                            data-field="itsm_tags"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        {/* Description */}
                        <formInstance.Field name="description">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Description"
                                    required
                                    disabled={getDisabled('description', field.state.value, mode === 'update')}
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
                                            multiline
                                            rows={4}
                                            placeholder="Brief description of what this agent or tool does"
                                            className="text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-gray-300"
                                            data-field="description"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        {/* Instruction */}
                        <formInstance.Field name="instruction">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Instruction"
                                    required
                                    disabled={getDisabled('instruction', field.state.value, mode === 'update')}
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
                                            multiline
                                            rows={20}
                                            placeholder="Detailed system instruction for the agent or tool"
                                            className="text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-gray-300"
                                            data-field="instruction"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>
                </div>
            </div>

            {/* Footer */}
            {mode === 'view' ? null : (
                <div className="sticky z-2 bottom-0 mt-2 bg-white flex items-center justify-end brand-box-show-inset border-t border-(--brand-border-color) px-3 py-2">
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

export default UpdatePromptConfigForm;
