import { resolveFieldDisabled } from '@/shared/utils/resolve-field-disabled';
import type { FieldDisableInfo } from '@/shared/utils/resolve-field-disabled';
import { FormField, TextInput, SelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { useForm, useStore } from '@tanstack/react-form';
import { Save, Trash2, Eye } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import z from 'zod';
import type { FormMode } from '@/shared/types/form';
import { httpsUrlSchema, requiredString512Chars } from '@/shared/utils/zod-schemas';
import logger from '@/shared/utils/logger';
import type { ITSMConnectorConfig } from '../../../types/itsm-connectors';
import KeyValueEditor, { type KVEntry } from '@/shared/components/ui/KeyValueEditor/KeyValueEditor';
import { recordToKV, kvToRecord, hasInvalidKVEntries } from '@/shared/utils/kv-utils';
import { useITSMConnectorConfigQuery } from '../../../hooks/useITSMConnectorConfigQuery';
import type { OverlayState } from '@/shared/components/ui/FormActionModal/FormActionModal';
import itsmTypeOptions from '../../../constatns/itsm-type-options';
import itsmAuthTypeOptions from '../../../constatns/itsm-auth-type-options';
import { useITSMConnectorDeleteMutation } from '../../../hooks/useITSMConnectorDeleteMutation';
import { useITSMConnectorOnboardMutation } from '../../../hooks/useITSMConnectorOnboardMutation';
import { useFormSubmitGuard, type FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';

// Types
interface ITSMConnectorFormProps {
    mode?: FormMode;
    initialValues?: Partial<ITSMConnectorConfig>;
    onSubmitSuccess?: (data: { formDataWhileSubmitting: ITSMConnectorConfig; message: string }) => Promise<void>;
    isFieldDisabled?: (info: FieldDisableInfo<FormMode>) => boolean | undefined;
    setOverlay?: (state: OverlayState) => void;
    setCanClose?: (canClose: boolean) => void;
}

const SERVICE_ACCOUNT_AUTH_TYPE = 'Service Account';
const BEARER_TOKEN_AUTH_TYPE = 'Bearer Token';

// Schema
const itsmConnectorSchema = z
    .object({
        itsm_tag: requiredString512Chars('ITSM tag is required')
            .max(15, 'ITSM tag length must be less than 15 chars!')
            .regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, underscore (_) and hyphen (-) are allowed'),
        itsm_type: requiredString512Chars('ITSM type is required'),
        itsm_auth_type: requiredString512Chars('Auth type is required'),
        itsm_url: httpsUrlSchema('ITSM URL is required', 'ITSM URL must be a valid URL', true),
        itsm_user: requiredString512Chars('ITSM User is required'),
        itsm_password: z.string(),
        bearer_token: z.string(),
    })
    .superRefine((data, ctx) => {
        if (data.itsm_auth_type === SERVICE_ACCOUNT_AUTH_TYPE) {
            if (!data.itsm_password.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'ITSM password is required for Service Account auth',
                    path: ['itsm_password'],
                });
            }
        }

        if (data.itsm_auth_type === BEARER_TOKEN_AUTH_TYPE) {
            if (!data.bearer_token.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Bearer token is required for Bearer Token auth',
                    path: ['bearer_token'],
                });
            }
        }
    });

type ITSMConnectorFormValues = z.infer<typeof itsmConnectorSchema>;

// Submit config per mode
const submitConfig: Record<FormMode, { label: string; submittingLabel: string; icon: React.ReactNode; className?: string }> = {
    create: { label: 'Onboard ITSM Connector', submittingLabel: 'Onboarding...', icon: <Save size={14} /> },
    update: { label: '', submittingLabel: '', icon: <Save size={14} /> },
    delete: { label: 'Delete ITSM Connector', submittingLabel: 'Deleting...', icon: <Trash2 size={14} /> },
    view: { label: 'ITSM Connector Details', submittingLabel: 'Close', icon: <Eye size={14} /> },
};

const descriptionByMode: Record<FormMode, string> = {
    create: 'Provide ITSM connector details to onboard a new integration.',
    update: '',
    delete: 'Review connector details and proceed. This action cannot be undone.',
    view: '',
};

const inputClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const selectTriggerClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.7rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

// Component
const ITSMConnectorForm: React.FC<ITSMConnectorFormProps> = ({ mode = 'create', initialValues, onSubmitSuccess, isFieldDisabled, setOverlay, setCanClose }) => {
    logger.debug('ITSMConnectorForm - Rendered with props:', { mode, initialValues });

    const itsmConnectorOnboardMutation = useITSMConnectorOnboardMutation();
    const itsmConnectorDeleteMutation = useITSMConnectorDeleteMutation();

    const itsmConnectorConfigQuery = useITSMConnectorConfigQuery({
        payload: { itsm_tag: initialValues?.itsm_tag ?? '' },
        enabled: ['delete', 'view'].includes(mode) && !!initialValues?.itsm_tag,
    });

    const [additionalConfig, setAdditionalConfig] = useState<KVEntry[]>(recordToKV(initialValues?.itsm_additional_config ?? {}));

    const { guardedOnSubmit } = useFormSubmitGuard<ITSMConnectorFormValues, { message?: string }>({
        getValues: () => formInstance.store.state.values as ITSMConnectorFormValues,
        defaultValues: {
            itsm_tag: initialValues?.itsm_tag ?? '',
            itsm_type: initialValues?.itsm_type ?? '',
            itsm_auth_type: initialValues?.itsm_auth_type ?? '',
            itsm_url: initialValues?.itsm_url ?? '',
            itsm_user: initialValues?.itsm_user ?? '',
            itsm_password: initialValues?.itsm_password ?? '',
            bearer_token: initialValues?.bearer_token ?? '',
        },
        guards: (mode === 'delete' ? ['confirm-before-submit'] : []) satisfies FormSubmitGuard[],
        submitWithValues: 'all-values',
        confirmTitle: 'Are you sure?',
        confirmMessage: 'Deleting this ITSM Connector may affect agents or tools using it. This action cannot be undone.',
        confirmProceedLabel: 'Yes, delete it',
        confirmDiscardLabel: 'No, keep it',
        onSubmit: async (value) => {
            const data = value as ITSMConnectorFormValues;

            const payload: ITSMConnectorConfig = {
                itsm_tag: data.itsm_tag,
                itsm_type: data.itsm_type,
                itsm_auth_type: data.itsm_auth_type,
                itsm_url: data.itsm_url,
                itsm_user: data.itsm_user,
                itsm_password: data.itsm_password,
                bearer_token: data.bearer_token,
                itsm_additional_config: kvToRecord(additionalConfig),
            };

            let response;

            if (mode === 'create') {
                response = await itsmConnectorOnboardMutation.mutateAsync({ payload });
            }

            if (mode === 'delete') {
                response = await itsmConnectorDeleteMutation.mutateAsync({ payload: { itsm_tag: payload.itsm_tag } });
            }

            return { message: response?.message ?? '' };
        },
    });

    const formInstance = useForm({
        defaultValues: {
            itsm_tag: initialValues?.itsm_tag ?? '',
            itsm_type: initialValues?.itsm_type ?? '',
            itsm_auth_type: initialValues?.itsm_auth_type ?? '',
            itsm_url: initialValues?.itsm_url ?? '',
            itsm_user: initialValues?.itsm_user ?? '',
            itsm_password: initialValues?.itsm_password ?? '',
            bearer_token: initialValues?.bearer_token ?? '',
        },
        validators: {
            onSubmit: ['create'].includes(mode) ? itsmConnectorSchema : undefined,
            onChange: ['create'].includes(mode) ? itsmConnectorSchema : undefined,
        },
        onSubmit: async ({ value }) => {
            if (hasInvalidKVEntries(additionalConfig)) return;

            const response = await guardedOnSubmit();

            if (response === undefined) return;

            const payload: ITSMConnectorConfig = {
                itsm_tag: value.itsm_tag,
                itsm_type: value.itsm_type,
                itsm_auth_type: value.itsm_auth_type,
                itsm_url: value.itsm_url,
                itsm_user: value.itsm_user,
                itsm_password: value.itsm_password,
                bearer_token: value.bearer_token,
                itsm_additional_config: kvToRecord(additionalConfig),
            };

            await onSubmitSuccess?.({
                formDataWhileSubmitting: payload,
                message: response.message ?? '',
            });

            formInstance.reset();
            setAdditionalConfig([]);
        },
    });

    useEffect(() => {
        if (itsmConnectorConfigQuery.isSuccess && itsmConnectorConfigQuery.data) {
            const { itsm_tag, itsm_type, itsm_auth_type, itsm_url, itsm_user, itsm_password, bearer_token } = itsmConnectorConfigQuery.data;
            formInstance.setFieldValue('itsm_tag', itsm_tag);
            formInstance.setFieldValue('itsm_type', itsm_type);
            formInstance.setFieldValue('itsm_auth_type', itsm_auth_type);
            formInstance.setFieldValue('itsm_url', itsm_url);
            formInstance.setFieldValue('itsm_user', itsm_user ?? '');
            formInstance.setFieldValue('itsm_password', itsm_password ?? '');
            formInstance.setFieldValue('bearer_token', bearer_token ?? '');
            setAdditionalConfig(recordToKV(itsmConnectorConfigQuery.data.itsm_additional_config ?? {}));
        }
    }, [itsmConnectorConfigQuery.data]);

    const isSubmissionInProgress = useStore(formInstance.store, (s) => s.isSubmitting);
    const authType = useStore(formInstance.store, (s) => s.values.itsm_auth_type);
    const isServiceAccount = authType === SERVICE_ACCOUNT_AUTH_TYPE;
    const isBearerToken = authType === BEARER_TOKEN_AUTH_TYPE;

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
    const isFormDisabled = mode === 'view' || mode === 'delete';

    const isLoading = itsmConnectorConfigQuery.isLoading || isSubmissionInProgress;
    const isError = itsmConnectorConfigQuery.isError;
    const error = itsmConnectorConfigQuery.error;
    const handleRetry = () => itsmConnectorConfigQuery.refetch();

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
            <div className="relative flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-col gap-1 p-4">
                    <p className="text-sm text-(--brand-title-primary-color)">{descriptionByMode[mode]}</p>

                    <div className="mt-5 flex flex-col gap-3">
                        {/* Row: ITSM Tag + ITSM Type */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <formInstance.Field name="itsm_tag">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="ITSM Tag"
                                        required
                                        disabled={getDisabled('itsm_tag', field.state.value, mode !== 'view')}
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
                                                placeholder="e.g. servicenow_prod"
                                                className={inputClassName}
                                                data-field="itsm_tag"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="itsm_type">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="ITSM Type"
                                        required
                                        disabled={getDisabled('itsm_type', field.state.value, mode !== 'view')}
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
                                                options={itsmTypeOptions}
                                                placeholder="Select ITSM type"
                                                triggerClassName={selectTriggerClassName}
                                                data-field="itsm_type"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>

                        {/* ITSM URL */}
                        <formInstance.Field name="itsm_url">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="ITSM URL"
                                    required
                                    disabled={getDisabled('itsm_url', field.state.value, mode !== 'view')}
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
                                            placeholder="e.g. https://instance.service-now.com"
                                            className={inputClassName}
                                            data-field="itsm_url"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Auth Type */}
                            <formInstance.Field
                                name="itsm_auth_type"
                                listeners={{
                                    onChange: () => {
                                        formInstance.resetField('bearer_token');
                                        formInstance.resetField('itsm_user');
                                        formInstance.resetField('itsm_password');
                                    },
                                }}
                            >
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Auth Type"
                                        required
                                        disabled={getDisabled('itsm_auth_type', field.state.value, mode !== 'view')}
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
                                                options={itsmAuthTypeOptions}
                                                placeholder="Select authentication type"
                                                triggerClassName={selectTriggerClassName}
                                                data-field="itsm_auth_type"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>

                            <formInstance.Field name="itsm_user">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="ITSM User"
                                        required
                                        disabled={getDisabled('itsm_user', field.state.value, mode !== 'view')}
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
                                                placeholder="e.g. svc_account"
                                                className={inputClassName}
                                                data-field="itsm_user"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>

                        {/* Service Account - Basic */}
                        {isServiceAccount && (
                            <formInstance.Field name="itsm_password">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="ITSM Password"
                                        disabled={getDisabled('itsm_password', field.state.value, mode !== 'view')}
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
                                                placeholder="Enter password"
                                                className={inputClassName}
                                                data-field="itsm_password"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        )}

                        {/* Bearer Token - OAuth */}
                        {isBearerToken && (
                            <formInstance.Field name="bearer_token">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Bearer Token"
                                        disabled={getDisabled('bearer_token', field.state.value, mode !== 'view')}
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
                                                placeholder="Enter bearer token"
                                                className={inputClassName}
                                                data-field="bearer_token"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        )}

                        {/* Additional Config */}
                        <KeyValueEditor
                            entries={additionalConfig}
                            onChange={setAdditionalConfig}
                            disabled={isFormDisabled}
                            label="Additional Config"
                            emptyMessage="No additional config entries."
                            allowCustomKeys={true}
                            allowedKeys={['SYSUSER_FIELDS']}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            {mode === 'view' ? null : (
                <div className="sticky z-2 bottom-0 mt-2 bg-white flex items-center justify-center brand-box-show-inset border-t border-(--brand-border-color) px-3 py-2">
                    <formInstance.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                        {({ isSubmitting, canSubmit }) => (
                            <FormActionButton
                                isSubmitting={isSubmitting}
                                disabled={!canSubmit || isSubmitting || hasInvalidKVEntries(additionalConfig)}
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

export default ITSMConnectorForm;
