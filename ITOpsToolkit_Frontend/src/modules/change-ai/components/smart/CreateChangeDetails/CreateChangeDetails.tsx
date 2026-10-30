import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import z from 'zod';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { FormField, TextInput, SelectInput, DateInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import ChangeDetailsTabs, { type ChangeDetailsTab } from '../../ui/ChangeDetailsTabs/ChangeDetailsTabs';
import changeTypeOptions from '../../../constants/change-type-options';
import { usePushChangeRequestToItsmMutation } from '../../../hooks/usePushChangeRequestToItsmMutation';
import type { DraftChangeResponse, PushChangesResponse } from '../../../types/change-ai';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';

type DetailsTabValue = 'details' | 'planning' | 'analysis';

interface CreateChangeDetailsProps {
    draft: DraftChangeResponse;
    /** Configuration item captured from the change request form. */
    cmdb_ci: string;
    /** Base64 attachments captured from the change request form. */
    attachments: string[];
    onCancel: () => void;
    onCreated?: (result: PushChangesResponse) => void;
}

const detailsSchema = z
    .object({
        short_description: z.string().nonempty('Short Description is required'),
        description: z.string().nonempty('Description is required'),
        chg_model: z.string().nonempty('Change Type is required'),
        start_date: z.string().nonempty('Start date is required'),
        end_date: z.string().nonempty('End date is required'),
        test_plan: z.string(),
        backout_plan: z.string(),
        implementation_plan: z.string(),
        risk_impact_analysis: z.string(),
    })
    .refine((data) => new Date(data.start_date) < new Date(data.end_date), {
        message: 'End Date must be greater than Start Date',
        path: ['end_date'],
    });

const tabs: Array<ChangeDetailsTab<DetailsTabValue>> = [
    { label: 'Details', value: 'details' },
    { label: 'Planning', value: 'planning' },
    { label: 'Analysis', value: 'analysis' },
];

// Standard variant styling — mirrors the SampleForm "Salary Range" field:
// label stacked on top, input on the next line.
const labelClassName = 'mb-0.5 block text-xs font-medium text-gray-700';
const inputClassName = 'text-[0.75rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-muted-color)';
const singleLineInputClassName = 'h-[28px] text-[0.75rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-muted-color)';

const CreateChangeDetails: React.FC<CreateChangeDetailsProps> = ({ draft, cmdb_ci, attachments, onCancel, onCreated }) => {
    const [activeTab, setActiveTab] = useState<DetailsTabValue>('details');
    const [createdResult, setCreatedResult] = useState<PushChangesResponse | null>(null);

    const pushMutation = usePushChangeRequestToItsmMutation();

    const form = useForm({
        defaultValues: {
            short_description: draft.change_details.short_description ?? '',
            description: draft.change_details.description ?? '',
            chg_model: changeTypeOptions.find((opt) => opt.value.toLowerCase() === draft.change_details.chg_model?.toLowerCase())?.value ?? 'Normal',
            start_date: draft.change_details.start_date,
            end_date: draft.change_details.end_date,
            test_plan: draft.change_details.test_plan ?? '',
            backout_plan: draft.change_details.backout_plan ?? '',
            implementation_plan: draft.change_details.implementation_plan ?? '',
            risk_impact_analysis: draft.impact_analysis ?? '',
        },
        validators: {
            onSubmit: detailsSchema,
        },
        onSubmit: async ({ value }) => {
            const result = await pushMutation.mutateAsync({
                cmdb_ci,
                short_description: value.short_description,
                description: value.description,
                implementation_plan: value.implementation_plan,
                backout_plan: value.backout_plan,
                test_plan: value.test_plan,
                chg_model: value.chg_model,
                start_date: value.start_date,
                end_date: value.end_date,
                risk_impact_analysis: value.risk_impact_analysis,
                attachments,
            });

            setCreatedResult(result);
            onCreated?.(result);
        },
    });

    if (createdResult) {
        return (
            <ShellLayout className="rounded">
                <ShellLayout.Header>
                    <TitleWithArraow title="CHANGE CREATED" />
                </ShellLayout.Header>
                <ShellLayout.Body className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="flex items-center justify-center size-12 rounded-full bg-green-50">
                        <CheckCircle2 size={26} className="text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-(--brand-title-primary-color)">Change request created!</h2>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                            Reference: <span className="font-bold text-(--brand-text-color)">{createdResult.number}</span>
                        </p>
                    </div>
                    {createdResult.sys_id ? (
                        <a
                            href={getServiceNowLink({ sysId: createdResult.sys_id, type: 'change_request' })}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                        >
                            <ExternalLink size={13} /> Open in ITSM
                        </a>
                    ) : null}
                    <button type="button" onClick={onCancel} className="text-xs text-gray-400 underline transition-colors hover:text-gray-600 cursor-pointer">
                        Create another change
                    </button>
                </ShellLayout.Body>
            </ShellLayout>
        );
    }

    return (
        <ShellLayout className="rounded">
            <ShellLayout.Header>
                <TitleWithArraow title="CREATE CHANGE DETAILS" />
            </ShellLayout.Header>
            <ShellLayout.Body className="p-4">
                <form
                    className="flex h-full min-h-0 flex-col"
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                >
                    <ChangeDetailsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-6 flex-none" />

                    {/* Scrollable fields area */}
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                        {/* Details tab */}
                        <div className={twMerge('flex flex-col gap-4', activeTab !== 'details' && 'hidden')}>
                            <form.Field name="short_description">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Short Description" required labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, onFocus, hasError, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                placeholder="Short Description"
                                                className={singleLineInputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            <form.Field name="description">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Description" required labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, onFocus, hasError, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                multiline
                                                rows={7}
                                                placeholder="Description"
                                                className={inputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            <form.Field name="chg_model">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Change Type" required labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, hasError }) => (
                                            <SelectInput
                                                value={(value as string) ?? null}
                                                onChange={onChange as (v: string) => void}
                                                onBlur={onBlur}
                                                error={hasError}
                                                options={changeTypeOptions}
                                                placeholder="Select change type"
                                                clearable={false}
                                                triggerClassName={singleLineInputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>
                        </div>

                        {/* Planning tab */}
                        <div className={twMerge('flex flex-col gap-4', activeTab !== 'planning' && 'hidden')}>
                            <div className="flex gap-5">
                                <form.Field name="start_date">
                                    {(field) => (
                                        <FormField field={field} variant="standard" label="Planned Start Date" required errorMinHeight={0}>
                                            {({ value, onChange, onBlur, disabled }) => (
                                                <DateInput
                                                    value={value as string}
                                                    onChange={onChange as (v: string) => void}
                                                    onBlur={onBlur}
                                                    disabled={disabled}
                                                    minDate={new Date(Date.now())}
                                                    // maxDate={new Date(Date.now())}
                                                    // triggerClassName={standardInput}
                                                    time
                                                />
                                            )}
                                        </FormField>
                                    )}
                                </form.Field>

                                <form.Field name="end_date">
                                    {(field) => (
                                        <FormField field={field} variant="standard" label="Planned End Date" required errorMinHeight={0}>
                                            {({ value, onChange, onBlur, disabled }) => (
                                                <DateInput
                                                    value={value as string}
                                                    onChange={onChange as (v: string) => void}
                                                    onBlur={onBlur}
                                                    disabled={disabled}
                                                    minDate={new Date(Date.now())}
                                                    // maxDate={new Date(Date.now())}
                                                    // triggerClassName={standardInput}
                                                    time
                                                />
                                            )}
                                        </FormField>
                                    )}
                                </form.Field>
                            </div>

                            <form.Field name="test_plan">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Test Plan" labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, onFocus, hasError, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                multiline
                                                rows={5}
                                                placeholder="Test Plan"
                                                className={inputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            <form.Field name="backout_plan">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Backout Plan" labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, onFocus, hasError, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                multiline
                                                rows={5}
                                                placeholder="Backout Plan"
                                                className={inputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            <form.Field name="implementation_plan">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Implementation Plan" labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, onFocus, hasError, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                multiline
                                                rows={5}
                                                placeholder="Implementation Plan"
                                                className={inputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>
                        </div>

                        {/* Analysis tab */}
                        <div className={twMerge('flex flex-col gap-4', activeTab !== 'analysis' && 'hidden')}>
                            <form.Field name="risk_impact_analysis">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Impact Analysis" labelClassName={labelClassName}>
                                        {({ value, onChange, onBlur, onFocus, hasError, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                multiline
                                                rows={20}
                                                placeholder="Impact Analysis"
                                                className={inputClassName}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-3 border-t border-(--brand-border-color) pt-4">
                        <FormActionButton variant="brand" isSubmitting={false} onClick={onCancel} label="Cancel" submittingLabel="Cancel" className="min-w-0 w-40 rounded-md" />
                        <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                            {({ isSubmitting, canSubmit }) => (
                                <FormActionButton
                                    variant="primary"
                                    isSubmitting={isSubmitting}
                                    disabled={!canSubmit}
                                    onClick={form.handleSubmit}
                                    label="Create Change"
                                    submittingLabel="Creating..."
                                    className="min-w-0 w-40 rounded-md"
                                />
                            )}
                        </form.Subscribe>
                    </div>
                </form>
            </ShellLayout.Body>
        </ShellLayout>
    );
};

export default CreateChangeDetails;
