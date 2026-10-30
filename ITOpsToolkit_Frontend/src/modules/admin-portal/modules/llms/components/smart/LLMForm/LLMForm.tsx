import llmConfigFieldsByType from '@/modules/admin-portal/modules/llms/constants/llm-config-fields-by-type';
import llmTypeOptions from '@/modules/admin-portal/modules/llms/constants/llm-type-options';
import useOnboardLLLMMutation from '@/modules/admin-portal/modules/llms/hooks/useOnboardLLMMutation';
import useDeleteLLMMutation from '@/modules/admin-portal/modules/llms/hooks/useDeleteLLMMutation';
import type { LLM, OnboardLLMRequest } from '@/modules/admin-portal/modules/llms/types/llms';
import getLLMConfigFieldsByType from '@/modules/admin-portal/modules/llms/utils/get-llm-config-fields-by-type';
import { resolveFieldDisabled } from '@/shared/utils/resolve-field-disabled';
import type { FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import { FormField, TextInput, SelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { useForm, useStore } from '@tanstack/react-form';
import { Eye, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useCallback } from 'react';
import z from 'zod';
import type { FormMode } from '@/shared/types/form';
import { httpsUrlSchema, requiredString512Chars } from '@/shared/utils/zod-schemas';
import { useFormSubmitGuard, type FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';
import type { OverlayState } from '@/shared/components/ui/FormActionModal/FormActionModal';

// Types
type LLMType = keyof typeof llmConfigFieldsByType;

interface OnboardLLMFormProps {
    mode?: FormMode;
    initialValues?: Partial<OnboardLLMRequest> & { associated_agents_or_tools?: Array<string> };
    onSubmitSuccess?: (data: { formDataWhileSubmitting: LLM; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<FormMode>) => boolean | undefined;
    setOverlay?: (state: OverlayState) => void;
    setCanClose?: (canClose: boolean) => void;
}

// Schemas
const awsNovaConfigSchema = z.object({
    AWS_ACCESS_KEY_ID: requiredString512Chars('AWS access key is required'),
    AWS_SECRET_ACCESS_KEY: requiredString512Chars('AWS secret access key is required'),
    AWS_REGION_NAME: requiredString512Chars('AWS region is required').regex(/^([a-z]{2}-(?:gov-|iso-|isob-|)[a-z]+-\d+)$/, 'AWS region must be valid, e.g. us-east-1'),
});

const azureOpenAIConfigSchema = z.object({
    AZURE_API_KEY: requiredString512Chars('Azure API key is required'),
    AZURE_API_BASE: httpsUrlSchema('Azure API base URL is required', 'Azure API base must be a valid URL'),
    AZURE_API_VERSION: requiredString512Chars('Azure API version is required'),
    AZURE_DEPLOYMENT_NAME: requiredString512Chars('Azure deployment name is required'),
});

const googleGeminiConfigSchema = z.object({
    VERTEX_AI_PROJECT: requiredString512Chars('Vertex AI project is required'),
    GEMINI_API_KEY: requiredString512Chars('Gemini API key is required'),
});

const llmTagSchema = z
    .string()
    .trim()
    .min(1, 'LLM tag is required')
    .max(15, 'LLM tag length must be less than 15 chars!')
    .regex(/^[a-z0-9_.\-]+$/, 'Only lowercase letters, numbers, underscore (_), hyphen (-) and dot (.) are allowed');

const baseSchema = z.object({
    llm_tag: llmTagSchema,
    llm_type: z.string().min(1, 'LLM Type is required'),
    llm_config: z.record(z.string(), z.any()),
    associated_agents_or_tools: z.string(),
});

export const onboardLLMRequestSchema = baseSchema.superRefine((val, ctx) => {
    if (val.llm_type === 'AWS Nova') {
        const result = awsNovaConfigSchema.safeParse(val.llm_config);
        if (!result.success) {
            result.error.issues.forEach((issue) =>
                ctx.addIssue({
                    path: [`llm_config.${issue.path.join('.')}`],
                    message: issue.message,
                    code: z.ZodIssueCode.custom,
                }),
            );
        }
    }

    if (val.llm_type === 'Azure OpenAI') {
        const result = azureOpenAIConfigSchema.safeParse(val.llm_config);
        if (!result.success) {
            result.error.issues.forEach((issue) =>
                ctx.addIssue({
                    path: ['llm_config', ...issue.path],
                    message: issue.message,
                    code: z.ZodIssueCode.custom,
                }),
            );
        }
    }

    if (val.llm_type === 'Google Gemini') {
        const result = googleGeminiConfigSchema.safeParse(val.llm_config);
        if (!result.success) {
            result.error.issues.forEach((issue) =>
                ctx.addIssue({
                    path: ['llm_config', ...issue.path],
                    message: issue.message,
                    code: z.ZodIssueCode.custom,
                }),
            );
        }
    }
});

// Submit config per mode
const submitConfig: Record<FormMode, { label: string; submittingLabel: string; icon: React.ReactNode; className?: string }> = {
    create: { label: 'Onboard LLM', submittingLabel: 'Onboarding...', icon: <Save size={14} /> },
    update: { label: '', submittingLabel: '', icon: <Save size={14} /> },
    delete: { label: 'Delete LLM', submittingLabel: 'Deleting...', icon: <Trash2 size={14} />, className: '' },
    view: { label: 'LLM Details', submittingLabel: 'Close', icon: <Eye size={14} />, className: '' },
};

const inputClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const selectTriggerClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.7rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

const descriptionByMode: Record<FormMode, string> = {
    create: 'Provide LLM details and required configuration to onboard.',
    update: '',
    delete: 'Review LLM details and proceed. This action cannot be undone.',
    view: '',
};

// Component
const LLMForm: React.FC<OnboardLLMFormProps> = ({ mode = 'create', initialValues, onSubmitSuccess, isFieldDisabled, setCanClose, setOverlay }) => {
    const onboardMutation = useOnboardLLLMMutation();
    const deleteMutation = useDeleteLLMMutation();

    const { guardedOnSubmit } = useFormSubmitGuard<z.infer<typeof baseSchema>, { message?: string }>({
        getValues: () => formInstance.store.state.values as z.infer<typeof baseSchema>,
        defaultValues: {
            llm_tag: initialValues?.llm_tag ?? '',
            llm_type: initialValues?.llm_type ?? '',
            llm_config: initialValues?.llm_config ?? {},
            associated_agents_or_tools: initialValues?.associated_agents_or_tools?.join('\n') ?? '',
        },
        guards: (mode === 'delete' ? ['confirm-before-submit'] : []) satisfies FormSubmitGuard[],
        submitWithValues: 'all-values',
        confirmTitle: 'Are you sure?',
        confirmMessage: mode === 'delete' ? 'Deleting this LLM may affect agents or tools using it. This action cannot be undone.' : 'Invalid Operation !',
        confirmProceedLabel: mode === 'delete' ? 'Yes, delete it' : 'Yes, proceed',
        confirmDiscardLabel: 'No, Keep it',
        onSubmit: async (value) => {
            const data = value as z.infer<typeof baseSchema>;
            let response;

            if (mode === 'delete') {
                response = await deleteMutation.mutateAsync({ llm_tag: data.llm_tag });
            }

            if (mode === 'create') {
                response = await onboardMutation.mutateAsync({
                    payload: { llm_config: data.llm_config, llm_tag: data.llm_tag, llm_type: data.llm_type },
                });
            }

            return { message: response?.message ?? '' };
        },
    });

    const formInstance = useForm({
        defaultValues: {
            llm_tag: initialValues?.llm_tag ?? '',
            llm_type: initialValues?.llm_type ?? '',
            llm_config: initialValues?.llm_config ?? {},
            associated_agents_or_tools: initialValues?.associated_agents_or_tools?.join('\n') ?? '',
        },
        validators: {
            onSubmit: ['create', 'update'].includes(mode) ? onboardLLMRequestSchema : undefined,
            onChange: ['create', 'update'].includes(mode) ? onboardLLMRequestSchema : undefined,
        },
        onSubmit: async ({ value: payload }) => {
            const response = await guardedOnSubmit();

            if (response === undefined) return;

            await onSubmitSuccess?.({
                formDataWhileSubmitting: {
                    llm_tag: payload.llm_tag,
                    llm_type: payload.llm_type,
                    updated_by: 'Current User',
                    llm_config: payload.llm_config,
                    associated_agents_or_tools: [],
                    updated_at: new Date().toISOString(),
                },
                message: response.message ?? '',
            });

            formInstance.reset();
        },
    });

    const selectedLLMType = useStore(formInstance.store, (s) => s.values.llm_type);
    const isSubmissionInProgress = useStore(formInstance.store, (s) => s.isSubmitting);

    useEffect(() => {
        if (isSubmissionInProgress) {
            setOverlay?.({ isLoading: true });
            setCanClose?.(false);
        } else {
            setOverlay?.({ isLoading: false });
            setCanClose?.(true);
        }
    }, [isSubmissionInProgress]);

    const selectedLLMConfigFields = useMemo(() => {
        if (!selectedLLMType) return [];
        return llmConfigFieldsByType[selectedLLMType as LLMType] ?? [];
    }, [selectedLLMType]);

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

    return (
        <form className="relative flex h-full w-full flex-col">
            <div className="relative flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1 p-4">
                    <p className="text-sm mb-2 text-(--brand-title-primary-color)">{descriptionByMode[mode]}</p>

                    <div className="mt-2 flex gap-4">
                        {/* LLM Type */}
                        <div className="flex-1">
                            <formInstance.Field
                                name="llm_type"
                                listeners={{
                                    onChange: ({ value }) => {
                                        formInstance.setFieldValue('llm_config', getLLMConfigFieldsByType(value));
                                    },
                                }}
                            >
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="LLM Type"
                                        required
                                        disabled={getDisabled('llm_type', field.state.value, false)}
                                        labelClassName={labelClassName}
                                        errorClassName={errorClassName}
                                        errorMinHeight={0}
                                    >
                                        {({ value, onChange, onBlur, hasError, disabled }) => (
                                            <SelectInput
                                                value={value as string}
                                                onChange={onChange as (v: string) => void}
                                                onBlur={onBlur}
                                                error={hasError}
                                                disabled={disabled}
                                                options={llmTypeOptions}
                                                placeholder="Select LLM Type"
                                                triggerClassName={selectTriggerClassName}
                                                data-field="llm_type"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>

                        {/* LLM Tag */}
                        <div className="flex-1">
                            <formInstance.Field name="llm_tag">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="LLM Tag"
                                        required
                                        disabled={getDisabled('llm_tag', field.state.value, false)}
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
                                                placeholder="e.g. azure_gpt4o"
                                                className={inputClassName}
                                                data-field="llm_tag"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>
                    </div>

                    {/* LLM Config fields */}
                    <div className="mt-5 rounded-md border border-(--brand-text-muted-color)/40 bg-white/5 p-3">
                        <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-(--brand-title-primary-color)">
                            {selectedLLMType ? `${selectedLLMType} Configuration` : 'LLM Configuration'}
                        </p>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                            {selectedLLMConfigFields.length > 0 ? (
                                selectedLLMConfigFields.map((configField) => (
                                    <formInstance.Field key={configField.key} name={`llm_config.${configField.key}` as `llm_config.${string}`}>
                                        {(field) => (
                                            <FormField
                                                field={field}
                                                variant="standard"
                                                label={configField.label}
                                                required
                                                disabled={getDisabled(`llm_config.${configField.key}`, field.state.value, true)}
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
                                                        placeholder={configField.placeholder}
                                                        className={inputClassName}
                                                        data-field={`llm_config.${configField.key}`}
                                                    />
                                                )}
                                            </FormField>
                                        )}
                                    </formInstance.Field>
                                ))
                            ) : (
                                <p className="col-span-full text-xs text-(--brand-text-gray)">Select an LLM Type to provide required configuration.</p>
                            )}
                        </div>
                    </div>

                    {/* Associated Agents or Tools */}
                    {['delete', 'view'].includes(mode) ? (
                        <div className="flex-1 mt-3">
                            <formInstance.Field name="associated_agents_or_tools">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Associated Agents or Tools"
                                        disabled={getDisabled('associated_agents_or_tools', field.state.value, false)}
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
                                                placeholder="Associated Agents or Tools"
                                                className="text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-gray-300"
                                                data-field="associated_agents_or_tools"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Footer */}
            {mode === 'view' ? null : (
                <div className="sticky bg-white bottom-0 mt-2 flex items-center justify-end brand-box-show-inset border-t border-(--brand-border-color) px-3 py-2">
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

export default LLMForm;
