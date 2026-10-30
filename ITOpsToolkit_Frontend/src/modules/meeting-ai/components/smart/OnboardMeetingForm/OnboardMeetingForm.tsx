import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useStore } from '@tanstack/react-form';
import z from 'zod';
import type { OnboardMeetingResponse } from '@/modules/meeting-ai/types/meeting-ai';
import { useOnboardMeetingMutation } from '@/modules/meeting-ai/hooks/useOnboardMeetingMutation';
import { meetingsByGroupAndUserQueryKey } from '@/modules/meeting-ai/hooks/useMeetingsByGroupAndUserQuery';
import { FormField, TextInput, MultiSelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';

export interface OnboardMeetingFormProps {
    groupOptions: string[];
    onSuccess?: (meeting: OnboardMeetingResponse) => void;
    className?: ClassNameValue;
}

const labelClassName = 'text-(--ticket-id-color) ';

const onboardMeetingSchema = z.object({
    title: z.string().trim().min(1, 'Meeting title is required.'),
    groups: z.array(z.string()).min(1, 'Select at least one group.'),
    webMeetingUrl: z.string().trim().min(1, 'Meeting URL is required.'),
});

type OnboardMeetingFormValues = z.infer<typeof onboardMeetingSchema>;

const defaultValues: OnboardMeetingFormValues = {
    title: '',
    groups: [],
    webMeetingUrl: '',
};

const OnboardMeetingForm: React.FC<OnboardMeetingFormProps> = ({ groupOptions, onSuccess, className }) => {
    const queryClient = useQueryClient();
    const onboardMutation = useOnboardMeetingMutation();

    const formInstance = useForm({
        formId: 'onboard-meeting-from',
        defaultValues,
        validators: {
            onSubmit: onboardMeetingSchema,
            onChange: onboardMeetingSchema,
        },
        onSubmit: async ({ value }) => {
            const data = await onboardMutation.mutateAsync({
                title: value.title.trim(),
                web_meeting_url: value.webMeetingUrl.trim(),
                groups: value.groups.join('|'),
            });
            queryClient.invalidateQueries({ queryKey: [meetingsByGroupAndUserQueryKey[0]] });
            onSuccess?.(data);
            formInstance.reset();
        },
    });

    const isSubmitting = useStore(formInstance.store, (s) => s.isSubmitting);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                formInstance.handleSubmit();
            }}
            noValidate
            className={twMerge('flex flex-col gap-3 p-4', className)}
        >
            <formInstance.Field name="title">
                {(field) => (
                    <FormField field={field} variant="standard" label="Meeting Title" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, onFocus, hasError, disabled, id }) => (
                            <TextInput
                                id={id}
                                value={value as string}
                                onChange={onChange}
                                onBlur={onBlur}
                                onFocus={onFocus}
                                disabled={disabled}
                                placeholder="Enter meeting title"
                                error={hasError}
                                className=" border-gray-300"
                            />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="groups">
                {(field) => (
                    <FormField field={field} variant="standard" label="Group" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, hasError }) => (
                            <MultiSelectInput
                                options={groupOptions.map((g) => ({ value: g, label: g }))}
                                value={value as string[]}
                                onChange={(v) => onChange(v)}
                                onBlur={onBlur}
                                placeholder="Select groups"
                                maxChips={2}
                                error={hasError}
                            />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <formInstance.Field name="webMeetingUrl">
                {(field) => (
                    <FormField field={field} variant="standard" label="Meeting URL" required labelClassName={labelClassName} errorMinHeight={0}>
                        {({ value, onChange, onBlur, onFocus, hasError, disabled, id }) => (
                            <TextInput
                                id={id}
                                value={value as string}
                                onChange={onChange}
                                onBlur={onBlur}
                                onFocus={onFocus}
                                disabled={disabled}
                                placeholder="https://..."
                                error={hasError}
                                className=" border-gray-300"
                            />
                        )}
                    </FormField>
                )}
            </formInstance.Field>

            <div className="flex justify-between items-center gap-2 pt-3">
                <FormActionButton
                    variant="brand"
                    onClick={() => formInstance.reset()}
                    label="Clear"
                    className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm!"
                    submittingLabel={''}
                    isSubmitting={false}
                />

                <FormActionButton
                    isSubmitting={isSubmitting}
                    onClick={() => formInstance.handleSubmit()}
                    label="Add Meeting"
                    submittingLabel="Adding..."
                    className="min-w-32! 2xl:min-w-40! rounded-full! text-xs! 2xl:text-sm! btn-split split-white-blue-light"
                />
            </div>
        </form>
    );
};

OnboardMeetingForm.displayName = 'OnboardMeetingForm';

export default OnboardMeetingForm;
