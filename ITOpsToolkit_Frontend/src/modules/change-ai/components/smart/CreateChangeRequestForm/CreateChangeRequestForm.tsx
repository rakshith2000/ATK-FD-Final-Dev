import { useCallback, useRef } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import z from 'zod';
import { FormField, TextInput, FileUploadInput, SelectInput } from '@/shared/components/ui/InputFields';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import fileToBase64 from '../../../utils/file-to-base64';
import type { DraftChangeRequest } from '../../../types/change-ai';
import ChatbotLoader from '@/shared/components/ui/Placeholders/ChatbotLoader';
import { searchSnowCmdbCi } from '@/shared/modules/servicenow/services/search-snow-cmdb-ci';
import { useUploadDraftImage } from '@/modules/change-ai/hooks/uploadDraftImageMutation';

export interface GenerateChangeArgs {
    /** Payload for the draft_change API. */
    request: DraftChangeRequest;
    /** Configuration item carried forward to the push_change_request_to_itsm API. */
    cmdb_ci: string;
    /** Base64 attachments carried forward to the push_change_request_to_itsm API. */
    attachments: string[];
}

interface CreateChangeRequestFormProps {
    onGenerate: (args: GenerateChangeArgs) => void | Promise<void>;
    isGenerating: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/bmp'];

const changeRequestSchema = z.object({
    change_title: z.string().nonempty('Name of the change is required'),
    change_purpose: z.string().nonempty('Purpose of the change is required'),
    config_items: z.string().nonempty('Configuration Item is required'),
    os_info: z.string(),
    attachment: z
        .instanceof(File, { message: 'Please upload a valid file' })
        .refine((f) => ALLOWED_IMAGE_TYPES.includes(f.type), 'Allowed formats: JPG, PNG, GIF, SVG, BMP.')
        .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, 'File exceeds the 10MB size limit.')
        .optional(),
});

// Standard variant: persistent label above the input (default input styling)
const standardInput = 'text-[0.75rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-muted-color)';

const CreateChangeRequestForm: React.FC<CreateChangeRequestFormProps> = ({ onGenerate, isGenerating }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadMutation = useUploadDraftImage();

    const handleUploadClick = (files: File) => {
        if (uploadMutation.isPending) return;
        if (files) {
            const selectedFile = files;
            uploadMutation.mutate(selectedFile);
        }
    };

    const handleRemoveAttachment = () => {
        if (uploadMutation.isPending) return;
        form.setFieldValue('attachment', undefined);
        uploadMutation.reset();
    };

    const form = useForm({
        formId: 'CreateChangeRequestForm',
        defaultValues: {
            change_title: '',
            change_purpose: '',
            config_items: '',
            os_info: '',
            attachment: undefined as File | undefined,
        },
        validators: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit: changeRequestSchema as any,
        },
        onSubmit: async ({ value }) => {
            const uploadedFileBase64 = value.attachment ? await fileToBase64(value.attachment) : '';
            const fileName = value.attachment ? value.attachment.name : '';
            await onGenerate({
                request: {
                    change_title: value.change_title,
                    change_purpose: value.change_purpose,
                    config_items: value.config_items,
                    os_info: value.os_info,
                    uploaded_files: fileName,
                },
                cmdb_ci: value.config_items,
                attachments: uploadedFileBase64 ? [uploadedFileBase64] : [],
            });
        },
    });

    const searchCmdbCiAsync = useCallback(async (searchTerm: string) => {
        const results = await searchSnowCmdbCi(searchTerm);
        return results.map((ci) => ({ label: ci.name, value: ci.sys_id }));
    }, []);

    const isSubmissionInProgress = useStore(form.store, (state) => state.isSubmitting);

    return (
        <ShellLayout className="rounded">
            <ShellLayout.Header>
                <TitleWithArraow title="CREATE CHANGE REQUEST" />
            </ShellLayout.Header>
            <ShellLayout.Body className="p-0">
                <form className="relative flex h-full w-full flex-col">
                    {isSubmissionInProgress || isGenerating ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                            <ChatbotLoader />
                        </div>
                    ) : null}

                    <div className="relative flex-1 overflow-y-auto brand-box-show-inset">
                        <div className="flex flex-col gap-3 p-4">
                            {/* Name of the change */}
                            <form.Field name="change_title">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Name of the change" required errorMinHeight={0}>
                                        {({ value, onChange, onBlur, onFocus, hasError, disabled, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                disabled={disabled}
                                                placeholder="Enter change name"
                                                className={standardInput}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            {/* Purpose of the change */}
                            <form.Field name="change_purpose">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Purpose of the change" required errorMinHeight={0}>
                                        {({ value, onChange, onBlur, hasError, disabled }) => (
                                            <TextInput
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                error={hasError}
                                                disabled={disabled}
                                                multiline
                                                rows={5}
                                                placeholder="Describe the purpose of this change"
                                                className={standardInput}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            {/* Configuration Item */}
                            <form.Field name="config_items">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Configuration Item" required errorMinHeight={0}>
                                        {({ value, onChange, onBlur, hasError, disabled }) => (
                                            <SelectInput
                                                value={(value as string) ?? null}
                                                onChange={onChange as (v: string) => void}
                                                onBlur={onBlur}
                                                error={hasError}
                                                disabled={disabled}
                                                optionsAsync={searchCmdbCiAsync}
                                                // options={[{ label: incidentData.cmdb_ci?.display_value ?? '', value: incidentData.cmdb_ci?.value ?? '' }].filter(
                                                //     (opt) => opt.value !== '',
                                                // )}
                                                optionsAsyncDebounce={400}
                                                placeholder="Search Configuration Item"
                                                // triggerClassName={selectTriggerClassName}
                                                data-field="cmdb_ci"
                                                id="cmdb_ci"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            {/* Operating System (Optional) */}
                            <form.Field name="os_info">
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Operating System (Optional)" errorMinHeight={0}>
                                        {({ value, onChange, onBlur, onFocus, hasError, disabled, id }) => (
                                            <TextInput
                                                id={id}
                                                value={value as string}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onFocus={onFocus}
                                                error={hasError}
                                                disabled={disabled}
                                                placeholder="Enter operating system"
                                                className={standardInput}
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>

                            {/* Upload image (Optional) */}
                            {/* Upload image (Optional) */}
                            <form.Field
                                name="attachment"
                                listeners={{
                                    onChange: ({ value }) => {
                                        handleUploadClick(value as unknown as File);
                                    },
                                }}
                            >
                                {(field) => (
                                    <FormField field={field} variant="standard" label="Upload image (Optional)" errorMinHeight={0}>
                                        {({ onChange, hasError, errorMessage, disabled }) => (
                                            <FileUploadInput
                                                value={field.state.value}
                                                onChange={onChange as (file: File) => void}
                                                onRemove={handleRemoveAttachment}
                                                error={hasError}
                                                errorMessage={errorMessage}
                                                disabled={disabled}
                                                inputRef={fileInputRef}
                                                title="Upload"
                                                infoText="JPG, PNG, GIF, SVG, BMP upto 10MB"
                                                accept=".jpg, .jpeg, .png, .gif, .svg, .bmp"
                                                iconSize={34}
                                                className="p-2"
                                                iconClassName="w-10 h-10"
                                                titleClassName="text-sm"
                                                infoClassName="text-[0.7rem]"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </form.Field>
                        </div>
                    </div>

                    <div className="sticky bottom-0 flex items-center justify-center border-t border-(--brand-border-color) px-3 py-2 brand-box-show-inset">
                        <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                            {({ isSubmitting, canSubmit }) => (
                                <FormActionButton
                                    variant="brand"
                                    isSubmitting={isSubmitting || isGenerating}
                                    disabled={!canSubmit || isSubmitting || isGenerating}
                                    onClick={form.handleSubmit}
                                    label="Generate Change"
                                    submittingLabel="Generating..."
                                    className="max-w-xs rounded-full py-2.5"
                                />
                            )}
                        </form.Subscribe>
                    </div>
                </form>
            </ShellLayout.Body>
        </ShellLayout>
    );
};

export default CreateChangeRequestForm;
