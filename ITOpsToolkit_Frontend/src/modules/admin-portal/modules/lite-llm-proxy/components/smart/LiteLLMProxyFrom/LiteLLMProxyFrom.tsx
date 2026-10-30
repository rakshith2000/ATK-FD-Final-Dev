import useDeleteLiteLLMProxyMutation from '../../../hooks/useDeleteLiteLLMProxyMutation';
import useOnboardLiteLLMProxyMutation from '../../../hooks/useOnboardLiteLLMProxyMutation';
import type { LiteLLMProxy } from '../../../types/lite-llm-proxy';
import { resolveFieldDisabled } from '@/shared/utils/resolve-field-disabled';
import type { FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import { FormField, TextInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { useForm, useStore } from '@tanstack/react-form';
import { Eye, Save, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import z from 'zod';
import type { FormMode } from '@/shared/types/form';
import { httpsUrlSchema, requiredString512Chars } from '@/shared/utils/zod-schemas';
import { useFormSubmitGuard, type FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';

// Types
interface OnboardLiteLLMProxyFormProps {
    mode?: FormMode;
    initialValues?: Partial<LiteLLMProxy>;
    onSubmitSuccess?: (data: { formDataWhileSubmitting: LiteLLMProxy; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<FormMode>) => boolean | undefined;
}

// Schema
const liteLLMProxySchema = z.object({
    proxy_base_url: httpsUrlSchema('Proxy base URL is required', 'Invalid Proxy base URL'),
    proxy_key: requiredString512Chars('Proxy key is required'),
});

// Submit config per mode
const submitConfig: Record<FormMode, { label: string; submittingLabel: string; icon: React.ReactNode; className?: string }> = {
    create: { label: 'Onboard Lite LLM Proxy', submittingLabel: 'Onboarding...', icon: <Save size={14} /> },
    update: { label: '', submittingLabel: '', icon: <Save size={14} /> },
    delete: { label: 'Delete Lite LLM Proxy', submittingLabel: 'Deleting...', icon: <Trash2 size={14} />, className: '' },
    view: { label: 'Lite LLM Proxy Details', submittingLabel: 'Close', icon: <Eye size={14} />, className: '' },
};

const descriptionByMode: Record<FormMode, string> = {
    create: 'Provide LiteLLM Proxy details and configuration to onboard.',
    update: '',
    delete: 'Current Lite LLM proxy details.',
    view: '',
};

const inputClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.7rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

// Component
const LiteLLMProxyForm: React.FC<OnboardLiteLLMProxyFormProps> = ({ mode = 'create', initialValues, onSubmitSuccess, isFieldDisabled }) => {
    const onboardMutation = useOnboardLiteLLMProxyMutation();
    const deleteMutation = useDeleteLiteLLMProxyMutation();

    const { guardedOnSubmit } = useFormSubmitGuard<z.infer<typeof liteLLMProxySchema>, { message?: string }>({
        getValues: () => formInstance.store.state.values as z.infer<typeof liteLLMProxySchema>,
        defaultValues: {
            proxy_base_url: initialValues?.proxy_base_url ?? '',
            proxy_key: initialValues?.proxy_key ?? '',
        },
        guards: (mode === 'delete' ? ['confirm-before-submit'] : []) satisfies FormSubmitGuard[],
        submitWithValues: 'all-values',
        confirmTitle: 'Are you sure?',
        confirmMessage: 'Deleting this Lite LLM Proxy may affect agents or tools using it. This action cannot be undone.',
        confirmProceedLabel: 'Yes, delete it',
        confirmDiscardLabel: 'No, keep it',
        onSubmit: async (value) => {
            const data = value as z.infer<typeof liteLLMProxySchema>;
            let response;

            if (mode === 'delete') {
                response = await deleteMutation.mutateAsync();
            }

            if (mode === 'create') {
                response = await onboardMutation.mutateAsync({ payload: data });
            }

            return { message: response?.message ?? '' };
        },
    });

    const formInstance = useForm({
        defaultValues: {
            proxy_base_url: initialValues?.proxy_base_url ?? '',
            proxy_key: initialValues?.proxy_key ?? '',
        },
        validators: {
            onSubmit: ['create'].includes(mode) ? liteLLMProxySchema : undefined,
            onChange: ['create'].includes(mode) ? liteLLMProxySchema : undefined,
        },
        onSubmit: async ({ value: payload }) => {
            const response = await guardedOnSubmit();

            if (response === undefined) return;

            await onSubmitSuccess?.({
                formDataWhileSubmitting: {
                    proxy_base_url: payload.proxy_base_url,
                    proxy_key: payload.proxy_key,
                },
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

    return (
        <form className="relative flex h-full w-full flex-col">
            <div className="relative flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1 px-4 py-2">
                    <p className="text-sm font-semibold text-(--brand-title-primary-color)">{descriptionByMode[mode]}</p>

                    <div className="mt-5 flex flex-col gap-4">
                        {/* Proxy Base URL */}
                        <formInstance.Field name="proxy_base_url">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Proxy Base URL"
                                    required
                                    disabled={getDisabled('proxy_base_url', field.state.value, mode !== 'view')}
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
                                            placeholder="e.g. https://proxy.example.com"
                                            className={inputClassName}
                                            data-field="proxy_base_url"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        {/* Proxy Key */}
                        <formInstance.Field name="proxy_key">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Proxy Key"
                                    required
                                    disabled={getDisabled('proxy_key', field.state.value, mode !== 'view')}
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
                                            placeholder="Enter your proxy key"
                                            className={inputClassName}
                                            data-field="proxy_key"
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
                <div className="sticky bottom-0 mt-2 flex items-center justify-center brand-box-show-inset border-t border-(--brand-border-color) px-3 py-2">
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
                                {...(mode === 'update' ? { variant: 'primary' as const } : {})}
                                {...(mode === 'create' ? { variant: 'brand' as const } : {})}
                            />
                        )}
                    </formInstance.Subscribe>
                </div>
            )}
        </form>
    );
};

export default LiteLLMProxyForm;
