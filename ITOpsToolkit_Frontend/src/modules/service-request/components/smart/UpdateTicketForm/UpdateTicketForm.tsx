import { FormField, TextInput, SelectInput } from '@/shared/components/ui/InputFields';
import { useForm, useStore } from '@tanstack/react-form';
import type { SnowTicket, SnowTableName } from '../../../../../shared/modules/servicenow/types/ticket';
import ticketUrgencyOptions from '../../../../../shared/modules/servicenow/constants/ticket-urgency-options';
import ticketImpactOptions from '../../../../../shared/modules/servicenow/constants/ticket-impact-options';
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { useCallback, useId, useImperativeHandle, useRef, useState } from 'react';
import logger from '@/shared/utils/logger';
import { getChangedFields } from '@/shared/utils/tanstack-form-utils';
import ticketPriorityMatrix from '../../../../../shared/modules/servicenow/constants/ticket-priority-matrix';
import z from 'zod';
import { twMerge } from 'tailwind-merge';
import { withFallbackOptionFromSnowDataField } from '@/shared/utils/get-option-from-snow-data-field';
import { useServiceRequestTicketFormQueries } from '../../../hooks/useServiceRequestTicketFormQueries';
import { usePatchTicketMutation } from '../../../../../shared/modules/servicenow/hooks/usePatchTicketMutation';
import ticketClouserCodeOptions from '@/shared/modules/servicenow/constants/ticket-clouser-code-options';
import { useFormSubmitGuard, type FormSubmitGuard } from '@/shared/hooks/useFormSubmitGuard';
import { fetchSnowAssignmentGroups } from '../../../../../shared/modules/servicenow/services/fetch-snow-assignment-groups';
import { fetchSnowAssignmentGroupMembersBySysId } from '../../../../../shared/modules/servicenow/services/fetch-snow-assignment-group-members-by-sys-id';
import { searchSnowCmdbCi } from '../../../../../shared/modules/servicenow/services/search-snow-cmdb-ci';

export interface UpdateTicketFormImperativeHandle {
    setFieldValue: (field: keyof z.infer<typeof ticketSchema>, value: string) => void;
    getFieldValue: (field: keyof z.infer<typeof ticketSchema>) => string;
    resetField: (field: keyof z.infer<typeof ticketSchema>) => void;
    resetForm: () => void;
    submitForm: () => void;
}

interface UpdateTicketFormProps {
    ticketId: string;
    ticketData: SnowTicket;
    ticketType: SnowTableName;
    onDirtyChange?: (isDirty: boolean) => void;
    onSubmitSuccess?: ({ updatedTicketResponse, ticketId }: { ticketId: string; updatedTicketResponse: SnowTicket }) => Promise<void>;
    onTicketStateChange?: (ticketState: string) => Promise<void>;
    imperativeRef?: React.Ref<UpdateTicketFormImperativeHandle>;
    isExternalLoading?: boolean;
    isTechAssistPending?: boolean;
    externalLoadingMessage?: string;
    isExternalError?: boolean;
    externalErrorRetryLabel?: string;
    externalError?: Error | null;
    handleExternalErrorRetry?: () => void;
    enableAuditEntries?: boolean;
}

const ticketSchema = z
    .object({
        request_state: z.string().nonempty('State is required'),
        priority: z.string().nonempty('Priority is required'),
        assignment_group: z.string().nonempty('Assignment Group is required'),
        urgency: z.string().nonempty('Urgency is required'),
        assigned_to: z.string().nonempty('Assigned To is required'),
        impact: z.string().nonempty('Impact is required'),
        short_description: z.string(),
        cmdb_ci: z.string(),
        description: z.string(),
        comments: z.string(),
        work_notes: z.string(),
        close_notes: z.string(),
        close_code: z.string(),
    })
    .superRefine((data, ctx) => {
        if (['6', '7', '157'].includes(data.request_state)) {
            if (!data.close_notes) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Resolution / Close Notes is required !',
                    path: ['close_notes'],
                });
            }
            if (!data.close_code) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Clouser Code is required !',
                    path: ['close_code'],
                });
            }
        }
    });

const selectTriggerClassName = 'h-[25px] text-[0.65rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const inputClassName = 'h-[25px] text-[0.65rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const multilineInputClassName = 'text-[0.65rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.65rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

const UpdateTicketForm: React.FC<UpdateTicketFormProps> = ({
    ticketData,
    ticketId,
    ticketType,
    onSubmitSuccess,
    onDirtyChange,
    onTicketStateChange,
    externalError,
    externalLoadingMessage,
    isExternalError,
    externalErrorRetryLabel,
    isExternalLoading,
    isTechAssistPending,
    handleExternalErrorRetry,
    imperativeRef,
    enableAuditEntries = false,
}) => {
    const isDirtyRef = useRef(false);
    const onDirtyChangeRef = useRef(onDirtyChange);

    const [showJournalEntries, setShowJournalEntries] = useState(false);

    const journalEntriesRef = useRef<HTMLDivElement>(null);
    const formId = useId();

    const patchTicketMutation = usePatchTicketMutation();

    const defaultFormValues = {
        request_state: ticketData?.request_state?.value ?? '',
        priority: ticketData?.priority?.value ?? '',
        assignment_group: ticketData?.assignment_group?.value ?? '',
        urgency: ticketData?.urgency?.value ?? '',
        assigned_to: ticketData?.assigned_to?.value ?? '',
        impact: ticketData?.impact?.value ?? '',
        short_description: ticketData?.short_description?.value ?? '',
        cmdb_ci: ticketData?.cmdb_ci?.value ?? '',
        description: ticketData?.description?.value ?? '',
        comments: ticketData?.comments?.value ?? '',
        work_notes: ticketData?.work_notes?.value ?? '',
        close_notes: ticketData?.close_notes?.value ?? '',
        close_code: ticketData?.close_code?.value ?? '',
    };

    const { guardedOnSubmit } = useFormSubmitGuard<z.infer<typeof ticketSchema>, SnowTicket>({
        getValues: () => formInstance.store.state.values as z.infer<typeof ticketSchema>,
        defaultValues: defaultFormValues as z.infer<typeof ticketSchema>,
        guards: ['no-changes'] satisfies FormSubmitGuard[],
        submitWithValues: 'changed-only',
        noChangesTitle: 'Nothing to Update!',
        noChangesNote: 'No new changes found in ticket to update.',
        onSubmit: async (payload) => {
            logger.debug('Submitting changes:', payload);

            const updatedTicketResponse = await patchTicketMutation.mutateAsync({
                ticketId: ticketId,
                ticketType: ticketType,
                changes: payload as Record<string, unknown>,
            });

            const fieldsToUpdate: Array<keyof z.infer<typeof ticketSchema>> = [
                'request_state',
                'priority',
                'assignment_group',
                'urgency',
                'assigned_to',
                'impact',
                'short_description',
                'cmdb_ci',
                'description',
                'comments',
                'work_notes',
                'close_notes',
                'close_code',
            ];

            fieldsToUpdate.forEach((field) => {
                if (field in updatedTicketResponse) {
                    const val = updatedTicketResponse[field]?.value;
                    if (val !== undefined && val !== null) {
                        formInstance.setFieldValue(field, String(val));
                    }
                }
            });

            return updatedTicketResponse;
        },
    });

    const formInstance = useForm({
        formId: 'Service Request Update Issue',
        defaultValues: defaultFormValues,
        validators: {
            onSubmit: ticketSchema,
        },
        listeners: {
            onChange: ({ formApi }) => {
                const changedFields = getChangedFields(formApi.state.values, formApi.options.defaultValues);
                const isNowDirty = changedFields.length > 0;

                if (isNowDirty !== isDirtyRef.current) {
                    isDirtyRef.current = isNowDirty;
                    onDirtyChangeRef.current?.(isNowDirty);
                }
            },
        },
        onSubmit: async () => {
            const response = await guardedOnSubmit();

            if (response === undefined) return;

            await onSubmitSuccess?.({ updatedTicketResponse: response, ticketId: ticketId });

            ticketJournalEntries.refetch();
            onDirtyChange?.(false);
        },
    });

    useImperativeHandle(imperativeRef, () => ({
        setFieldValue: (field, value) => formInstance.setFieldValue(field, value),
        getFieldValue: (field) => formInstance.getFieldValue(field),
        resetForm: () => formInstance.reset(),
        submitForm: () => formInstance.handleSubmit(),
        resetField: (field) => formInstance.resetField(field),
    }));

    const selectedAssignmentGroupValue = useStore(formInstance.store, (state) => state.values.assignment_group);
    const selectedStateValue = useStore(formInstance.store, (state) => state.values.request_state);
    const isSubmissionInProgress = useStore(formInstance.store, (state) => state.isSubmitting);

    const getPriorityValueBasedOnImpactAndUrgency = ({ impact, urgency }: { impact: string; urgency: string }): string => {
        const key = `${urgency}-${impact}`;
        const calculatedPriority: number = (ticketPriorityMatrix as Record<string, number>)[key];
        return String(calculatedPriority);
    };

    const { ticketStateChoiceQuery, ticketJournalEntries, journalEntriesList } = useServiceRequestTicketFormQueries({
        ticketType,
        ticketId,
        shouldLoadJournalEntries: showJournalEntries,
        enableAuditEntries,
    });

    const searchAssignmentGroupsAsync = useCallback(async (searchTerm: string) => {
        const results = await fetchSnowAssignmentGroups({ searchTerm });
        return results.map((g) => ({ label: g.name, value: g.sys_id }));
    }, []);

    const searchGroupMembersAsync = useCallback(
        async (searchTerm: string) => {
            if (!selectedAssignmentGroupValue) return [];
            const results = await fetchSnowAssignmentGroupMembersBySysId({ groupSysId: selectedAssignmentGroupValue, searchTerm });
            return results.map((m) => ({ label: m.user.display_value, value: m.user.value }));
        },
        [selectedAssignmentGroupValue],
    );

    const searchCmdbCiAsync = useCallback(async (searchTerm: string) => {
        const results = await searchSnowCmdbCi(searchTerm);
        return results.map((ci) => ({ label: ci.name, value: ci.sys_id }));
    }, []);

    const toggleJournalEntries = () => {
        const next = !showJournalEntries;
        setShowJournalEntries(next);
        if (next) {
            setTimeout(() => {
                journalEntriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    };

    const showResolutionFields =
        (ticketData.request_state?.value && ['closed_complete', 'closed_skipped', 'closed_incomplete'].includes(ticketData.request_state?.value)) ||
        ['closed_complete', 'closed_skipped', 'closed_incomplete'].includes(selectedStateValue);

    return (
        <form key={ticketId} id={formId} className="relative w-full h-full flex flex-col">
            {isExternalLoading ? <LoadingPlaceholder overlay message={externalLoadingMessage ?? ''} /> : null}
            {isSubmissionInProgress ? <LoadingPlaceholder overlay message="Form submission is in progress..." /> : null}
            {isExternalError ? <ErrorPlaceholder retryLabel={externalErrorRetryLabel} overlay error={externalError} onRetry={handleExternalErrorRetry} /> : null}

            <div className={twMerge('relative overflow-y-auto flex-1 brand-box-show-inset')}>
                <div className="grid grid-cols-2 gap-x-1.5 gap-y-2 p-2 pt-2">
                    <formInstance.Field
                        name="request_state"
                        listeners={{
                            onChange: async ({ value }) => {
                                if (['closed_complete', 'closed_skipped', 'closed_incomplete', 'closed_cancelled', 'closed_rejected'].includes(value)) {
                                    formInstance.setFieldValue('close_code', 'Solved (Permanently)');
                                }
                                await onTicketStateChange?.(value);
                            },
                        }}
                    >
                        {(field) => (
                            <FormField field={field} variant="standard" label="State" required labelClassName={labelClassName} errorClassName={errorClassName} errorMinHeight={0}>
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <SelectInput
                                        value={(value as string) ?? null}
                                        onChange={onChange as (v: string) => void}
                                        onBlur={onBlur}
                                        error={hasError || ticketStateChoiceQuery.isError}
                                        disabled={disabled || isTechAssistPending}
                                        isLoading={ticketStateChoiceQuery.isFetching}
                                        errorMessage={ticketStateChoiceQuery.isError ? (ticketStateChoiceQuery.error?.message ?? 'Failed to load state options') : undefined}
                                        onRetry={ticketStateChoiceQuery.isError ? () => ticketStateChoiceQuery.refetch() : undefined}
                                        onRefetch={() => ticketStateChoiceQuery.refetch()}
                                        options={withFallbackOptionFromSnowDataField(ticketStateChoiceQuery.data, ticketData.request_state)}
                                        placeholder="Select state"
                                        triggerClassName={selectTriggerClassName}
                                        data-field="request_state"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="priority">
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="Priority"
                                required
                                disabled
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
                                        placeholder="Priority"
                                        className={inputClassName}
                                        data-field="priority"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    <formInstance.Field
                        name="assignment_group"
                        listeners={{
                            onChange: () => {
                                formInstance.setFieldValue('assigned_to', '');
                            },
                        }}
                    >
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="Assignment Group"
                                required
                                labelClassName={labelClassName}
                                errorClassName={errorClassName}
                                errorMinHeight={0}
                            >
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <SelectInput
                                        value={(value as string) ?? null}
                                        onChange={onChange as (v: string) => void}
                                        onBlur={onBlur}
                                        error={hasError}
                                        disabled={disabled}
                                        optionsAsync={searchAssignmentGroupsAsync}
                                        optionsAsyncDebounce={400}
                                        options={[{ label: ticketData.assignment_group?.display_value ?? '', value: ticketData.assignment_group?.value ?? '' }].filter(
                                            (opt) => opt.value !== '',
                                        )}
                                        placeholder="Search Assignment Group"
                                        triggerClassName={selectTriggerClassName}
                                        data-field="assignment_group"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    <formInstance.Field
                        name="urgency"
                        listeners={{
                            onChange: ({ value }) => {
                                formInstance.setFieldValue(
                                    'priority',
                                    getPriorityValueBasedOnImpactAndUrgency({
                                        impact: formInstance.getFieldValue('impact'),
                                        urgency: value,
                                    }),
                                );
                            },
                        }}
                    >
                        {(field) => (
                            <FormField field={field} variant="standard" label="Urgency" required labelClassName={labelClassName} errorClassName={errorClassName} errorMinHeight={0}>
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <SelectInput
                                        value={(value as string) ?? null}
                                        onChange={onChange as (v: string) => void}
                                        onBlur={onBlur}
                                        error={hasError}
                                        disabled={disabled}
                                        options={withFallbackOptionFromSnowDataField(ticketUrgencyOptions, ticketData.urgency)}
                                        placeholder="Urgency"
                                        triggerClassName={selectTriggerClassName}
                                        data-field="urgency"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="assigned_to">
                        {(field) => (
                            <FormField
                                field={field}
                                variant="standard"
                                label="Assigned To"
                                required
                                labelClassName={labelClassName}
                                errorClassName={errorClassName}
                                errorMinHeight={0}
                            >
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <SelectInput
                                        value={(value as string) ?? null}
                                        onChange={onChange as (v: string) => void}
                                        onBlur={onBlur}
                                        error={hasError}
                                        disabled={disabled || !selectedAssignmentGroupValue}
                                        optionsAsync={searchGroupMembersAsync}
                                        options={[{ label: ticketData.assigned_to?.display_value ?? '', value: ticketData.assigned_to?.value ?? '' }].filter(
                                            (opt) => opt.value !== '',
                                        )}
                                        optionsAsyncDebounce={400}
                                        placeholder="Search Assigned To"
                                        triggerClassName={selectTriggerClassName}
                                        data-field="assigned_to"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    <formInstance.Field
                        name="impact"
                        listeners={{
                            onChange: ({ value }) => {
                                formInstance.setFieldValue(
                                    'priority',
                                    getPriorityValueBasedOnImpactAndUrgency({
                                        impact: value,
                                        urgency: formInstance.getFieldValue('urgency'),
                                    }),
                                );
                            },
                        }}
                    >
                        {(field) => (
                            <FormField field={field} variant="standard" label="Impact" required labelClassName={labelClassName} errorClassName={errorClassName} errorMinHeight={0}>
                                {({ value, onChange, onBlur, hasError, disabled }) => (
                                    <SelectInput
                                        value={(value as string) ?? null}
                                        onChange={onChange as (v: string) => void}
                                        onBlur={onBlur}
                                        error={hasError}
                                        disabled={disabled}
                                        options={withFallbackOptionFromSnowDataField(ticketImpactOptions, ticketData.impact)}
                                        placeholder="Impact"
                                        triggerClassName={selectTriggerClassName}
                                        data-field="impact"
                                    />
                                )}
                            </FormField>
                        )}
                    </formInstance.Field>

                    <div className="col-span-2">
                        <formInstance.Field name="short_description">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Short Description"
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
                                            placeholder="Short Description"
                                            className={multilineInputClassName}
                                            data-field="short_description"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="col-span-2">
                        <formInstance.Field name="cmdb_ci">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Configuration Item"
                                    labelClassName={labelClassName}
                                    errorClassName={errorClassName}
                                    errorMinHeight={0}
                                >
                                    {({ value, onChange, onBlur, hasError, disabled }) => (
                                        <SelectInput
                                            value={(value as string) ?? null}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            optionsAsync={searchCmdbCiAsync}
                                            options={[{ label: ticketData.cmdb_ci?.display_value ?? '', value: ticketData.cmdb_ci?.value ?? '' }].filter((opt) => opt.value !== '')}
                                            optionsAsyncDebounce={400}
                                            placeholder="Search Configuration Item"
                                            triggerClassName={selectTriggerClassName}
                                            data-field="cmdb_ci"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="col-span-2">
                        <formInstance.Field name="description">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Description" labelClassName={labelClassName} errorClassName={errorClassName} errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id }) => (
                                        <TextInput
                                            id={id}
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            multiline
                                            placeholder="Description"
                                            className={multilineInputClassName}
                                            data-field="description"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="col-span-2">
                        <formInstance.Field name="comments">
                            {(field) => (
                                <FormField
                                    field={field}
                                    variant="standard"
                                    label="Additional comments"
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
                                            placeholder="Additional Comments (Customer visible)"
                                            className={multilineInputClassName}
                                            data-field="comments"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        <formInstance.Field name="work_notes">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Work Notes" labelClassName={labelClassName} errorClassName={errorClassName} errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id }) => (
                                        <TextInput
                                            id={id}
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            multiline
                                            placeholder="Work Notes"
                                            className={multilineInputClassName}
                                            data-field="work_notes"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {showResolutionFields ? (
                        <>
                            <div className="col-span-2">
                                <formInstance.Field name="close_notes">
                                    {(field) => (
                                        <FormField
                                            field={field}
                                            variant="standard"
                                            label="Resolution Notes"
                                            required
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
                                                    placeholder="Resolution Notes"
                                                    className={multilineInputClassName}
                                                    data-field="close_notes"
                                                />
                                            )}
                                        </FormField>
                                    )}
                                </formInstance.Field>
                            </div>

                            <div className="col-span-2">
                                <formInstance.Field name="close_code">
                                    {(field) => (
                                        <FormField
                                            field={field}
                                            variant="standard"
                                            label="Closure Code"
                                            required
                                            labelClassName={labelClassName}
                                            errorClassName={errorClassName}
                                            errorMinHeight={0}
                                        >
                                            {({ value, onChange, onBlur, hasError, disabled }) => (
                                                <SelectInput
                                                    value={(value as string) ?? null}
                                                    onChange={onChange as (v: string) => void}
                                                    onBlur={onBlur}
                                                    error={hasError}
                                                    disabled={disabled}
                                                    options={withFallbackOptionFromSnowDataField(ticketClouserCodeOptions, ticketData.close_code)}
                                                    placeholder="Closure Code"
                                                    triggerClassName={selectTriggerClassName}
                                                    data-field="close_code"
                                                />
                                            )}
                                        </FormField>
                                    )}
                                </formInstance.Field>
                            </div>
                        </>
                    ) : null}

                    <div className="col-span-2 pb-5" ref={journalEntriesRef}>
                        <button type="button" onClick={toggleJournalEntries} className="text-xs text-blue-500 underline cursor-pointer flex items-center gap-1">
                            {showJournalEntries ? (
                                <>
                                    Hide Notes <ChevronUp size={12} />
                                </>
                            ) : (
                                <>
                                    See Notes <ChevronDown size={12} />
                                </>
                            )}
                        </button>

                        {showJournalEntries && (
                            <div className="mt-2 flex flex-col gap-2">
                                {ticketJournalEntries.isLoading && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Loader2 size={12} className="animate-spin" />
                                        Loading notes...
                                    </div>
                                )}

                                {ticketJournalEntries.isError && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                                        <span>{ticketJournalEntries.error?.message ?? 'Failed to load notes'}</span>
                                        <button
                                            type="button"
                                            onClick={() => ticketJournalEntries.refetch()}
                                            className="flex items-center gap-0.5 text-blue-500 underline cursor-pointer"
                                        >
                                            <RefreshCw size={10} /> Retry
                                        </button>
                                    </div>
                                )}

                                {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && journalEntriesList.length === 0 && (
                                    <div className="text-xs text-gray-400">No notes found.</div>
                                )}

                                {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && journalEntriesList.length > 0 && (
                                    <>
                                        {journalEntriesList.map((entry, index) => {
                                            const isJournal = entry.type === 'journal';
                                            const isWorkNote = isJournal && entry.element === 'work_notes';
                                            const isCloseNote = isJournal && (entry.element === 'close_notes' || entry.element === 'resolution_notes');
                                            const formattedTime = (() => {
                                                try {
                                                    const date = new Date(entry.sys_created_on + ' UTC');

                                                    if (isNaN(date.getTime())) return entry.sys_created_on;

                                                    return date.toLocaleString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: true,
                                                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                                    });
                                                } catch {
                                                    return entry.sys_created_on;
                                                }
                                            })();

                                            return (
                                                <div
                                                    key={index}
                                                    className={twMerge(
                                                        'flex flex-col gap-1 rounded border p-2 transition-colors text-[0.65rem] leading-relaxed shadow-xs',
                                                        isJournal
                                                            ? isWorkNote
                                                                ? 'border-amber-100 bg-amber-50/30 text-amber-900'
                                                                : isCloseNote
                                                                  ? 'border-emerald-100 bg-emerald-50/30 text-emerald-900'
                                                                  : 'border-slate-100 bg-slate-50/30 text-slate-900'
                                                            : 'border-blue-100 bg-blue-50/30 text-blue-900',
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between border-b pb-1 mb-1 border-current/10">
                                                        <span className="font-semibold text-gray-800">{entry.sys_created_by}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[0.6rem] text-gray-700">{formattedTime}</span>
                                                            <span
                                                                className={twMerge(
                                                                    'rounded px-1 py-0.5 text-[0.55rem] font-medium tracking-wider',
                                                                    isJournal
                                                                        ? isWorkNote
                                                                            ? 'bg-amber-100/60 text-amber-700'
                                                                            : isCloseNote
                                                                              ? 'bg-emerald-100/60 text-emerald-700'
                                                                              : 'bg-slate-100/60 text-slate-700'
                                                                        : 'bg-blue-100/60 text-blue-700',
                                                                )}
                                                            >
                                                                {isJournal ? (isWorkNote ? 'Work Notes' : isCloseNote ? 'Close Notes' : 'Additional Comments') : 'Field Change'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isJournal ? (
                                                        <div className="whitespace-pre-wrap truncate text-gray-700">{entry.value}</div>
                                                    ) : (
                                                        <div className="text-gray-700">
                                                            Changed <span className="font-semibold text-blue-800">{entry.fieldname}</span> from{' '}
                                                            <span className="font-semibold text-red-600/80">{entry.oldvalue || 'none'}</span> to{' '}
                                                            <span className="font-semibold text-green-600">{entry.newvalue || 'none'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {ticketJournalEntries.hasNextPage && (
                                            <div className="flex flex-col items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => ticketJournalEntries.fetchNextPage()}
                                                    className="text-xs px-4 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                                                    disabled={ticketJournalEntries.isFetchingNextPage}
                                                >
                                                    {ticketJournalEntries.isFetchingNextPage ? 'Loading...' : 'Load more'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="sticky bottom-0 px-3 py-2 border-t border-(--brand-border-color) brand-box-show-inset flex justify-center items-center">
                <formInstance.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                    {({ isSubmitting, canSubmit }) => (
                        <FormActionButton
                            variant="brand"
                            isSubmitting={isSubmitting}
                            disabled={!canSubmit || isSubmitting}
                            onClick={formInstance.handleSubmit}
                            label="Update Ticket"
                            submittingLabel="Updating..."
                        />
                    )}
                </formInstance.Subscribe>
            </div>
        </form>
    );
};

export default UpdateTicketForm;
