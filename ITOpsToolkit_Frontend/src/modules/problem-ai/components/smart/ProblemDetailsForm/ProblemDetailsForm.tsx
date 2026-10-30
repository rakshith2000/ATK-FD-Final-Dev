import { useEffect } from 'react';
import z from 'zod';
import { useForm, useStore } from '@tanstack/react-form';
import { FormField, SelectInput, TextInput } from '@/shared/components/ui/InputFields';
// import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import type { ProblemTicket } from '../../../types/problem-ai';
import type { ProblemStatusFilter } from '../../../constants/problem-status-filter-options';
import calculateProblemPriority from '../../../utils/calculate-problem-priority';
import formatRecLabel from '../../../utils/format-rec-label';
import isRecommendationStatus from '../../../utils/is-recommendation-status';
import { useAssignmentGroupsQuery } from '../../../hooks/useAssignmentGroupsQuery';
import { useGroupMembersQuery } from '../../../hooks/useGroupMembersQuery';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';
import ticketUrgencyOptions from '@/shared/modules/servicenow/constants/ticket-urgency-options';
import ticketImpactOptions from '@/shared/modules/servicenow/constants/ticket-impact-options';

interface ProblemDetailsFormProps {
    ticket: ProblemTicket;
    status: ProblemStatusFilter;
    onChange: (next: ProblemTicket) => void;
}

const problemDetailsSchema = z.object({
    problem_ticket_number: z.string(),
    state: z.string().trim().min(1, 'State is required'),
    priority: z.string().trim().min(1, 'Priority is required'),
    urgency: z.string().trim().min(1, 'Urgency is required'),
    impact: z.string().trim().min(1, 'Impact is required'),
    assignment_group: z.string().trim().min(1, 'Assignment Group is required'),
    assigned_to: z.string().trim().min(1, 'Assigned To is required'),
    short_description: z.string().trim().min(1, 'Short Description is required'),
    description: z.string().trim().min(1, 'Description is required'),
});

type ProblemDetailsFormValues = z.infer<typeof problemDetailsSchema>;

const labelClassName = 'text-[0.7rem] 2xl:text-xs font-bold text-(--ticket-title-color) block mb-1 2xl:mb-1.5';

const ProblemDetailsForm: React.FC<ProblemDetailsFormProps> = ({ ticket, status, onChange }) => {
    // const { state: authState } = useAuth();
    // const currentUser = authState?.user?.displayName ?? authState?.user?.username ?? '';

    const stateChoicesQuery = useTicketFieldChoiceQuery('problem', 'state');
    const assignmentGroupsQuery = useAssignmentGroupsQuery();

    const isRecommendation = isRecommendationStatus(ticket?.approval_status);
    const isStateLocked = status === 'Recommended' || status === 'Rejected';
    const hasExistingState = !!ticket?.state;

    const defaultValues: ProblemDetailsFormValues = {
        problem_ticket_number: isRecommendation ? formatRecLabel(ticket?.id) : (ticket?.problem_ticket_number ?? ''),
        state: ticket?.state || ticket?.approval_status || '',
        priority: ticket?.priority ?? '',
        urgency: ticket?.urgency ?? '',
        impact: ticket?.impact ?? '',
        assignment_group: ticket?.assignment_group ?? '',
        assigned_to: ticket?.assigned_to ?? '',
        short_description: ticket?.short_description ?? '',
        description: ticket?.description ?? '',
    };

    const formInstance = useForm({
        formId: 'problem-details-form',
        defaultValues,
        validators: {
            onChange: problemDetailsSchema,
            onSubmit: problemDetailsSchema,
        },
        listeners: {
            onChange: ({ formApi }) => {
                const values = formApi.state.values;
                const patch: Partial<ProblemTicket> = {
                    problem_ticket_number: values.problem_ticket_number,
                    priority: values.priority,
                    urgency: values.urgency as ProblemTicket['urgency'],
                    impact: values.impact as ProblemTicket['impact'],
                    assignment_group: values.assignment_group,
                    assigned_to: values.assigned_to,
                    short_description: values.short_description,
                    description: values.description,
                };
                if (hasExistingState) {
                    patch.state = values.state as ProblemTicket['state'];
                } else {
                    patch.approval_status = values.state as ProblemTicket['approval_status'];
                }
                onChange({ ...ticket, ...patch });
            },
        },
        onSubmit: () => {
            // Submission is triggered from the parent's Approve/Update actions.
        },
    });

    const urgencyValue = useStore(formInstance.store, (s) => s.values.urgency);
    const impactValue = useStore(formInstance.store, (s) => s.values.impact);
    const assignmentGroupValue = useStore(formInstance.store, (s) => s.values.assignment_group);

    const groupMembersQuery = useGroupMembersQuery(assignmentGroupValue ?? '');

    useEffect(() => {
        const newPriority = calculateProblemPriority(urgencyValue, impactValue);
        if (newPriority && newPriority !== formInstance.getFieldValue('priority')) {
            formInstance.setFieldValue('priority', newPriority);
        }
    }, [urgencyValue, impactValue, formInstance]);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                formInstance.handleSubmit();
            }}
            noValidate
            className="grid grid-cols-2 gap-x-3 2xl:gap-x-4 gap-y-2 2xl:gap-y-3 p-3 2xl:p-4 "
        >
            <formInstance.Field name="problem_ticket_number">
                {(field) => (
                    <FormField field={field} variant="standard" label="Number:" labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, id }) => <TextInput id={id} value={value as string} disabled={true} />}
                    </FormField>
                )}
            </formInstance.Field>

            {/* <FormField variant="standard" label="Opened by:" labelClassName={labelClassName} errorMinHeight={0} value={currentUser} onChange={() => {}}>
                {({ value }) => <TextInput value={value as string} onChange={() => {}} disabled />}
            </FormField> */}

            <formInstance.Field name="priority">
                {(field) => (
                    <FormField field={field} variant="standard" label="Priority:" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value }) => <TextInput value={value as string} onChange={() => {}} disabled />}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="state">
                {(field) => (
                    <FormField field={field} variant="standard" label="State:" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, hasError }) => (
                            <SelectInput
                                value={value as string}
                                onChange={onChange}
                                onBlur={onBlur}
                                options={stateChoicesQuery.data ?? []}
                                disabled={isStateLocked}
                                placeholder="Select State"
                                error={hasError}
                            />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="urgency">
                {(field) => (
                    <FormField field={field} variant="standard" label="Urgency:" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, hasError }) => (
                            <SelectInput value={value as string} onChange={onChange} onBlur={onBlur} options={ticketUrgencyOptions} placeholder="Select Urgency" error={hasError} />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="impact">
                {(field) => (
                    <FormField field={field} variant="standard" label="Impact:" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, hasError }) => (
                            <SelectInput value={value as string} onChange={onChange} onBlur={onBlur} options={ticketImpactOptions} placeholder="Select Impact" error={hasError} />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="assignment_group">
                {(field) => (
                    <FormField field={field} variant="standard" label="Assignment Group:" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onBlur, hasError }) => (
                            <SelectInput
                                value={value as string}
                                onChange={(next) => {
                                    field.handleChange(next);
                                    formInstance.setFieldValue('assigned_to', '');
                                }}
                                onBlur={onBlur}
                                options={assignmentGroupsQuery.data ?? []}
                                placeholder="Select Assignment Group"
                                error={hasError}
                            />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="assigned_to">
                {(field) => (
                    <FormField field={field} variant="standard" label="Assigned to:" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, hasError }) => (
                            <SelectInput
                                value={value as string}
                                onChange={onChange}
                                onBlur={onBlur}
                                options={groupMembersQuery.data ?? []}
                                disabled={!assignmentGroupValue}
                                isLoading={groupMembersQuery.isLoading}
                                placeholder="Select Assigned To"
                                error={hasError}
                            />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <div className="col-span-2">
                <formInstance.Field name="short_description">
                    {(field) => (
                        <FormField field={field} variant="standard" label="Short Description:" required labelClassName={labelClassName} errorMinHeight={0}>
                            {({ value, onChange, onBlur, onFocus, hasError, disabled, id }) => (
                                <TextInput id={id} value={value as string} onChange={onChange} onBlur={onBlur} onFocus={onFocus} disabled={disabled} error={hasError} />
                            )}
                        </FormField>
                    )}
                </formInstance.Field>
            </div>

            <div className="col-span-2">
                <formInstance.Field name="description">
                    {(field) => (
                        <FormField field={field} variant="standard" label="Description:" required labelClassName={labelClassName} errorMinHeight={0}>
                            {({ value, onChange, onBlur, onFocus, hasError, disabled, id }) => (
                                <TextInput
                                    id={id}
                                    value={value as string}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    onFocus={onFocus}
                                    disabled={disabled}
                                    multiline
                                    rows={2}
                                    error={hasError}
                                />
                            )}
                        </FormField>
                    )}
                </formInstance.Field>
            </div>
        </form>
    );
};

export default ProblemDetailsForm;
