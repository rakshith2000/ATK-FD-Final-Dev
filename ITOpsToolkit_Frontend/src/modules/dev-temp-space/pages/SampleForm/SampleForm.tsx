import {
    FormField,
    TextInput,
    NumberInput,
    CheckboxInput,
    DateInput,
    DateRangeInput,
    NumberRangeInput,
    SelectInput,
    MultiSelectInput,
    FileUploadInput,
} from '@/shared/components/ui/InputFields';
import type { DateRangeValue, NumberRangeValue } from '@/shared/components/ui/InputFields';
import { useForm, useStore } from '@tanstack/react-form';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import logger from '@/shared/utils/logger';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import z from 'zod';
import { useRef } from 'react';
import { twMerge } from 'tailwind-merge';

//  Async option fetchers (simulated API calls)

const allUsers = [
    { label: 'Alice Johnson', value: 'alice' },
    { label: 'Bob Smith', value: 'bob' },
    { label: 'Charlie Brown', value: 'charlie' },
    { label: 'Diana Prince', value: 'diana' },
    { label: 'Eve Williams', value: 'eve' },
    { label: 'Frank Castle', value: 'frank' },
    { label: 'Grace Hopper', value: 'grace' },
    { label: 'Henry Ford', value: 'henry' },
    { label: 'Irene Adler', value: 'irene' },
    { label: 'Jack Sparrow', value: 'jack' },
];

const allTags = [
    { label: 'Frontend', value: 'frontend' },
    { label: 'Backend', value: 'backend' },
    { label: 'DevOps', value: 'devops' },
    { label: 'QA', value: 'qa' },
    { label: 'Security', value: 'security' },
    { label: 'Performance', value: 'performance' },
    { label: 'Documentation', value: 'documentation' },
    { label: 'Design', value: 'design' },
    { label: 'Database', value: 'database' },
    { label: 'API', value: 'api' },
    { label: 'Mobile', value: 'mobile' },
    { label: 'Cloud', value: 'cloud' },
];

const fetchUsersAsync = (searchTerm: string) =>
    new Promise<typeof allUsers>((resolve) => {
        setTimeout(() => {
            // reject(new Error('Failed to fetch tags')); // Simulate an error for demonstration
            const lower = searchTerm.toLowerCase();
            resolve(lower ? allUsers.filter((u) => u.label.toLowerCase().includes(lower) || u.value.includes(lower)) : allUsers);
        }, 600);
    });

const fetchTagsAsync = (searchTerm: string) =>
    new Promise<typeof allTags>((resolve) => {
        setTimeout(() => {
            // reject(new Error('Failed to fetch tags')); // Simulate an error for demonstration
            const lower = searchTerm.toLowerCase();
            resolve(lower ? allTags.filter((t) => t.label.toLowerCase().includes(lower) || t.value.includes(lower)) : allTags);
        }, 500);
    });

//  Schema

const sampleFormSchema = z.object({
    full_name: z.string().nonempty('Full Name is required'),
    email: z.string().nonempty('Email is required').email('Invalid email address'),
    department: z.string().nonempty('Department is required'),
    priority: z.string().nonempty('Priority is required'),
    category: z.string().nonempty('Category is required'),
    cities: z.array(z.string().trim().min(1, 'City is required')).min(1, 'Cities are required'),
    subject: z.string().nonempty('Subject is required'),
    description: z.string(),
    notes: z.string(),
    age: z.number({ message: 'Age must be a number' }).min(18, 'Must be at least 18').max(120, 'Must be at most 120').optional(),
    start_date: z.string(),
    start_date_time: z.string(),
    date_range: z.tuple([z.string().optional(), z.string().optional()]).optional(),
    salary_range: z.tuple([z.number().optional(), z.number().optional()]).optional(),
    assignee: z.string().optional(),
    tags: z.array(z.string()).optional(),
    agree_terms: z.boolean().refine((v) => v === true, { message: 'You must agree to the terms' }),
    attachment: z.instanceof(File, { message: 'Please upload a file' }).optional(),
});

const departmentOptions = [
    { label: 'Engineering', value: 'engineering' },
    { label: 'Operations', value: 'operations' },
    { label: 'Support', value: 'support' },
    { label: 'Infrastructure', value: 'infrastructure' },
    { label: 'Security', value: 'security' },
];

const priorityOptions = [
    { label: '1 - Critical', value: '1' },
    { label: '2 - High', value: '2' },
    { label: '3 - Medium', value: '3' },
    { label: '4 - Low', value: '4' },
];

const categoryOptions = [
    { label: 'Bug Report', value: 'bug' },
    { label: 'Feature Request', value: 'feature' },
    { label: 'Access Request', value: 'access' },
    { label: 'Infrastructure', value: 'infra' },
    { label: 'General Inquiry', value: 'general' },
];

const cityOptions = [
    { label: 'Bengaluru', value: 'bengaluru' },
    { label: 'Hyderabad', value: 'hyderabad' },
    { label: 'Chennai', value: 'chennai' },
    { label: 'Mumbai', value: 'mumbai' },
    { label: 'New Delhi', value: 'new-delhi' },
    { label: 'Pune', value: 'pune' },
    { label: 'Kolkata', value: 'kolkata' },
    { label: 'Ahmedabad', value: 'ahmedabad' },
    { label: 'Jaipur', value: 'jaipur' },
    { label: 'Kochi', value: 'kochi' },
    { label: 'Coimbatore', value: 'coimbatore' },
    { label: 'Visakhapatnam', value: 'visakhapatnam' },
    { label: 'Vijayawada', value: 'vijayawada' },
    { label: 'Mysuru', value: 'mysuru' },
    { label: 'Nagpur', value: 'nagpur' },
];

// Outlined variant: floating label, border from FormField
const outlinedInput =
    'h-[28px] text-[0.75rem] font-medium border-0 bg-transparent text-(--brand-text-color) placeholder:text-(--brand-text-muted-color) focus:ring-0 focus:outline-none';

// Filled variant: FormField handles bottom border & background
const filledInput =
    'h-[28px] text-[0.75rem] font-medium border-0 bg-transparent text-(--brand-text-color) placeholder:text-(--brand-text-muted-color) focus:ring-0 focus:outline-none rounded-none';
const filledTrigger = 'h-[28px] text-[0.75rem] font-medium border-0 bg-transparent text-(--brand-text-color) focus:ring-0 focus:outline-none rounded-none';
const filledMultiTrigger = 'min-h-[28px] h-auto text-[0.75rem] font-medium border-0 bg-transparent text-(--brand-text-color) focus:ring-0 focus:outline-none rounded-none';

// Standard variant: uses default input styling
const standardInput = 'h-[28px] text-[0.75rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-muted-color)';

const SampleForm: React.FC = () => {
    const formInstance = useForm({
        formId: 'SampleForm',
        defaultValues: {
            full_name: '',
            email: '',
            department: '',
            priority: '',
            category: '',
            cities: [] as string[],
            subject: '',
            description: '',
            notes: '',
            age: undefined as number | undefined,
            start_date: '',
            start_date_time: '',
            date_range: [undefined, undefined] as DateRangeValue,
            salary_range: [undefined, undefined] as NumberRangeValue,
            assignee: '',
            tags: [] as string[],
            agree_terms: false as boolean,
            attachment: undefined as File | undefined,
        },
        validators: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit: sampleFormSchema as any,
        },
        onSubmit: async ({ value }) => {
            logger.debug('SampleForm Submitted', value);

            await new Promise((resolve) => setTimeout(resolve, 1500));

            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Form Submitted Successfully!',
                note: `Request from ${value.full_name} (${value.email}) has been submitted.`,
                severity: 'success',
            });

            formInstance.reset();
        },
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const isSubmissionInProgress = useStore(formInstance.store, (state) => state.isSubmitting);

    return (
        <form className="relative w-full h-full flex flex-col">
            {isSubmissionInProgress ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                    <span className="text-xs text-gray-500">Submitting...</span>
                </div>
            ) : null}

            <div className="relative overflow-y-auto flex-1 brand-box-show-inset">
                <div className="p-3 pt-6 flex flex-col gap-0.5">
                    {/* Row 1: Outlined variant (floating label) */}
                    <div className="flex gap-1.5">
                        <formInstance.Field name="full_name">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Full Name" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id, inputClassName, isFloating }) => (
                                        <TextInput
                                            id={id}
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            placeholder={isFloating ? 'Enter full name' : ''}
                                            className={twMerge(outlinedInput, inputClassName)}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        <formInstance.Field name="email">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Email" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id, inputClassName, isFloating }) => (
                                        <TextInput
                                            id={id}
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            placeholder={isFloating ? 'Enter email address' : ''}
                                            className={twMerge(outlinedInput, inputClassName)}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 2: Filled variant (floating label + filled background) */}
                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="department">
                            {(field) => (
                                <FormField field={field} variant="filled" label="Department" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError, disabled, isFloating }) => (
                                        <SelectInput
                                            className="pt-2"
                                            value={value as string}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            options={departmentOptions}
                                            placeholder={isFloating ? 'Select Department' : ''}
                                            triggerClassName={filledTrigger}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>

                        <formInstance.Field name="priority">
                            {(field) => (
                                <FormField field={field} variant="filled" label="Priority" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError, disabled, isFloating }) => (
                                        <SelectInput
                                            className="pt-2"
                                            value={value as string}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            options={priorityOptions}
                                            placeholder={isFloating ? 'Select Priority' : ''}
                                            triggerClassName={filledTrigger}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 3: Standard + Outlined mix */}
                    <div className="flex gap-1.5">
                        <formInstance.Field name="category">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Category" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError, disabled }) => (
                                        <SelectInput
                                            value={value as string}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            options={categoryOptions}
                                            placeholder="Select Category"
                                            triggerClassName={standardInput}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="subject">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Subject" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id, inputClassName, isFloating }) => (
                                        <TextInput
                                            id={id}
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            placeholder={isFloating ? 'Enter subject' : ''}
                                            className={twMerge(outlinedInput, inputClassName)}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 4: Filled multi-select */}
                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="cities">
                            {(field) => (
                                <FormField field={field} variant="filled" label="Cities" required errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError, disabled, isFloating }) => (
                                        <MultiSelectInput
                                            className="pt-3.5"
                                            value={value as string[]}
                                            onChange={onChange as (v: string[]) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            options={cityOptions}
                                            placeholder={isFloating ? 'Select Cities' : ''}
                                            maxChips={2}
                                            triggerClassName={filledMultiTrigger}
                                            chipClassName="rounded-full px-1.5 py-0.5 text-[0.7rem] max-h-[22px]"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 5: Number (outlined) + Date (standard) */}
                    <div className="flex gap-1.5">
                        <formInstance.Field name="age">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Age" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id, inputClassName, isFloating }) => (
                                        <NumberInput
                                            id={id}
                                            value={value as number | ''}
                                            onChange={onChange as (v: number | undefined) => void}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            min={18}
                                            max={120}
                                            placeholder={isFloating ? 'Enter age' : ''}
                                            className={twMerge(outlinedInput, inputClassName)}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="start_date">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Start Date" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, disabled }) => (
                                        <DateInput
                                            value={value as string}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            disabled={disabled}
                                            triggerClassName={standardInput}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="start_date_time">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Start Date Time" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, disabled }) => (
                                        <DateInput
                                            value={value as string}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            disabled={disabled}
                                            maxDate={new Date(Date.now())}
                                            triggerClassName={standardInput}
                                            time
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 5b: Date Range (outlined) + Number Range (filled) */}
                    <div className="flex gap-1.5 mt-3">
                        <formInstance.Field name="date_range">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Project Duration" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, hasError, disabled, isFloating }) => (
                                        <DateRangeInput
                                            value={value as DateRangeValue}
                                            onChange={onChange as (v: DateRangeValue) => void}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            error={hasError}
                                            disabled={disabled}
                                            placeholder={isFloating ? 'Select date range' : ''}
                                            triggerClassName={twMerge(outlinedInput, 'border-0 bg-transparent focus:ring-0 focus:outline-none')}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="flex my-2">
                        <formInstance.Field name="salary_range">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Salary Range" errorMinHeight={0}>
                                    {({ value, onChange, hasError, disabled }) => (
                                        <NumberRangeInput
                                            className="pt-0"
                                            value={value as NumberRangeValue}
                                            onChange={onChange as (v: NumberRangeValue) => void}
                                            error={hasError}
                                            disabled={disabled}
                                            min={0}
                                            placeholder={['Min salary', 'Max salary']}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>
                    {/* Row 6: Textarea - standard variant */}
                    <div className="flex gap-1.5">
                        <formInstance.Field name="description">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Description" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, disabled }) => (
                                        <TextInput
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            disabled={disabled}
                                            multiline
                                            rows={3}
                                            placeholder="Describe your request"
                                            className="text-[0.75rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-muted-color)"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 7: Textarea - outlined variant */}
                    <div className="flex gap-1.5">
                        <formInstance.Field name="notes">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Additional Notes" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, onFocus, disabled, id, inputClassName, isFloating }) => (
                                        <TextInput
                                            id={id}
                                            value={value as string}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            disabled={disabled}
                                            multiline
                                            rows={2}
                                            placeholder={isFloating ? 'Any additional notes' : ''}
                                            className={twMerge(filledInput, inputClassName)}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 8: Async Select (single) + Async MultiSelect */}
                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="assignee">
                            {(field) => (
                                <FormField field={field} variant="outlined" label="Assignee (Async)" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError, disabled, isFloating }) => (
                                        <SelectInput
                                            value={value as string}
                                            onChange={onChange as (v: string) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            optionsAsync={fetchUsersAsync}
                                            optionsAsyncDebounce={400}
                                            placeholder={isFloating ? 'Search users...' : ''}
                                            triggerClassName={twMerge(outlinedInput, 'border-0 bg-transparent focus:ring-0 focus:outline-none')}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    <div className="flex gap-1.5 my-2">
                        <formInstance.Field name="tags">
                            {(field) => (
                                <FormField field={field} variant="filled" label="Tags (Async)" errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError, disabled, isFloating }) => (
                                        <MultiSelectInput
                                            className="pt-3.5"
                                            value={value as string[]}
                                            onChange={onChange as (v: string[]) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            disabled={disabled}
                                            optionsAsync={fetchTagsAsync}
                                            optionsAsyncDebounce={400}
                                            placeholder={isFloating ? 'Search tags...' : ''}
                                            maxChips={3}
                                            triggerClassName={filledMultiTrigger}
                                            chipClassName="rounded-full px-1.5 py-0.5 text-[0.7rem] max-h-[22px]"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 9: File Upload */}
                    <div className="flex gap-1.5">
                        <formInstance.Field name="attachment">
                            {(field) => (
                                <FormField field={field} variant="standard" label="Attachment" errorMinHeight={0}>
                                    {({ onChange, hasError, errorMessage, disabled }) => (
                                        <FileUploadInput
                                            value={field.state.value}
                                            onChange={onChange as (file: File) => void}
                                            error={hasError}
                                            errorMessage={errorMessage}
                                            disabled={disabled}
                                            inputRef={fileInputRef}
                                            title="Upload Attachment"
                                            infoText="<b>File size:</b> Maximum 1 MB | <b>Formats:</b> jpeg, png, pdf"
                                            accept=".jpeg,.jpg,.png,.pdf"
                                            iconOnly
                                            iconSize={24}
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Row 9: Checkbox */}
                    <div className="flex gap-1.5 mt-1">
                        <formInstance.Field name="agree_terms">
                            {(field) => (
                                <FormField field={field} errorMinHeight={0}>
                                    {({ value, onChange, onBlur, hasError }) => (
                                        <CheckboxInput
                                            checked={value as boolean}
                                            onChange={onChange as (v: boolean) => void}
                                            onBlur={onBlur}
                                            error={hasError}
                                            label="I agree to the terms and conditions"
                                            labelClassName="text-[0.75rem] text-(--brand-text-color)"
                                        />
                                    )}
                                </FormField>
                            )}
                        </formInstance.Field>
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
                            label="Submit Request"
                            submittingLabel="Submitting..."
                        />
                    )}
                </formInstance.Subscribe>
            </div>
        </form>
    );
};

export default SampleForm;
