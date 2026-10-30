import { resolveFieldDisabled } from '@/shared/utils/resolve-field-disabled';
import type { FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { FormField, SelectInput, FileUploadInput } from '@/shared/components/ui/InputFields';
import { useForm, useStore } from '@tanstack/react-form';
import { Save } from 'lucide-react';
import { useCallback, useRef } from 'react';
import z from 'zod';
import logger from '@/shared/utils/logger';
import { twMerge } from 'tailwind-merge';
import vaultTypeOptions from '../../../constants/vault-type-options';
import type { UploadVaultConfigRequest } from '../../../types/vault';
import { useUploadVaultConfigMutation } from '../../../hooks/useUploadVaultConfigMutation';

interface UploadVaultConfigFormProps {
    onSubmitSuccess?: (data: { formDataWhileSubmitting: UploadVaultConfigRequest; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<'create'>) => boolean | undefined;
    className?: string;
}

// Schema
const uploadVaultConfigSchema = z.object({
    vault_type: z.string().min(1, 'Vault type is required'),
    vault_env_file: z
        .instanceof(File, { message: 'Please upload a vault environment file' })
        .refine((f) => f.size > 0, 'File cannot be empty')
        .refine((f) => f.size <= 50 * 1024, 'File size must not exceed 50 KB')
        .refine((f) => ['.env', 'application/octet-stream', 'text/plain'].some((t) => f.type === t || f.name.endsWith('.env')), 'Only .env files are allowed'),
});

const selectTriggerClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-xs text-[var(--brand-title-primary-color)] mb-1 font-semibold';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

// Component
const UploadVaultConfigForm: React.FC<UploadVaultConfigFormProps> = ({ onSubmitSuccess, isFieldDisabled, className }) => {
    const uploadVaultConfigMutation = useUploadVaultConfigMutation();

    logger.debug('UploadVaultConfigForm - Rendered');

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const formInstance = useForm({
        defaultValues: {
            vault_type: '',
            vault_env_file: undefined as unknown as File,
        },
        validators: {
            onSubmit: uploadVaultConfigSchema,
            onChange: uploadVaultConfigSchema,
        },
        onSubmit: async ({ value }) => {
            const payload: UploadVaultConfigRequest = {
                vault_type: value.vault_type,
                vault_env_file: value.vault_env_file,
            };

            const response = await uploadVaultConfigMutation.mutateAsync({ payload });

            await onSubmitSuccess?.({
                formDataWhileSubmitting: payload,
                message: response?.message,
            });

            formInstance.reset();

            // clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
    });

    const isSubmissionInProgress = useStore(formInstance.store, (s) => s.isSubmitting);

    const getDisabled = useCallback(
        (fieldName: string, value: unknown, canEdit?: boolean) =>
            resolveFieldDisabled<'create'>({
                fieldName,
                mode: 'create',
                value,
                canEdit,
                isSubmissionInProgress,
                isFieldDisabled,
            }),
        [isSubmissionInProgress, isFieldDisabled],
    );

    return (
        <form className={twMerge('relative flex h-full w-full flex-col', className)}>
            <div className="relative flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-col gap-1 p-4">
                    <p className="text-sm font-semibold text-(--brand-title-primary-color)">Provide vault configuration details.</p>

                    <div className="mt-5 flex flex-col gap-4">
                        {/* Vault Type */}
                        <formInstance.Field name="vault_type">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Vault Type"
                                    required
                                    disabled={getDisabled('vault_type', field.state.value, true)}
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
                                            options={vaultTypeOptions}
                                            placeholder="Select vault type"
                                            triggerClassName={selectTriggerClassName}
                                            data-field="vault_type"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        {/* Vault Env File */}
                        <formInstance.Field name="vault_env_file">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Vault Environment File"
                                    required
                                    labelClassName={labelClassName}
                                    errorClassName={errorClassName}
                                    errorMinHeight={0}
                                >
                                    {({ onChange, hasError, errorMessage, disabled }) => (
                                        <FileUploadInput
                                            value={field.state.value}
                                            onChange={onChange as (file: File) => void}
                                            error={hasError}
                                            errorMessage={errorMessage}
                                            disabled={disabled}
                                            inputRef={fileInputRef}
                                            title="Click or drag to upload .env file"
                                            infoText="<b>File size:</b> Maximum 50 KB | <b>File Formats:</b> .env"
                                            accept=".env"
                                            iconOnly={false}
                                            iconSize={32}
                                            primaryColor="var(--brand-color)"
                                            secondaryColor="var(--brand-color)"
                                            infoClassName="text-[0.65rem]"
                                            titleClassName="text-xs"
                                            dropZoneClassName="p-2"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="sticky z-2 bottom-0 mt-2 bg-white flex items-center justify-center brand-box-show-inset border-t border-(--brand-border-color) px-3 py-2">
                <formInstance.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                    {({ isSubmitting, canSubmit }) => (
                        <FormActionButton
                            isSubmitting={isSubmitting}
                            disabled={!canSubmit || isSubmitting}
                            onClick={formInstance.handleSubmit}
                            label="Upload Vault Config"
                            submittingLabel="Uploading..."
                            icon={<Save size={14} />}
                            variant="brand"
                        />
                    )}
                </formInstance.Subscribe>
            </div>
        </form>
    );
};

export default UploadVaultConfigForm;
