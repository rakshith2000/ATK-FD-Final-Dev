import { FormField, SelectInput } from '@/shared/components/ui/InputFields';
import { useForm, useStore } from '@tanstack/react-form';
import { useMemo } from 'react';
import { Save } from 'lucide-react';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import z from 'zod';
import { useKbCategoriesQuery } from '@/shared/modules/atk-backend/hooks/useKbCategoriesQuery';
import { useUpdateKnowledgeArticleMutation } from '@/shared/modules/servicenow/hooks/useUpdateKnowledgeArticleMutation';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import type { UpdateKnowledgeArticleResposne } from '../../../types/knowledge';

interface UpdateKBArticleFormProps {
    shortDescription: string;
    articleText: string;
    articleNumber: string;
    onSubmitSuccess?: (data: UpdateKnowledgeArticleResposne) => Promise<void>;
    defaultValues?: {
        kb_knowledge_base: string;
        kb_category: string;
    };
}

const updateKBArticleSchema = z.object({
    kb_knowledge_base: z.string().nonempty('Knowledge Base is required'),
    kb_category: z.string().nonempty('Category is required'),
});

const selectTriggerClassName = 'h-[25px] text-[0.7rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.7rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

const UpdateKBArticleForm: React.FC<UpdateKBArticleFormProps> = ({ articleNumber, shortDescription, articleText, onSubmitSuccess, defaultValues }) => {
    const { getUserSnowDetails } = useAuth();

    const kbCategoriesQuery = useKbCategoriesQuery();
    const updateKnowledgeArticleMutation = useUpdateKnowledgeArticleMutation();

    const knowledgeBaseOptions = useMemo(() => {
        if (!kbCategoriesQuery.data) return [];
        return Object.keys(kbCategoriesQuery.data).map((key) => ({ value: key, label: key }));
    }, [kbCategoriesQuery.data]);

    const formInstance = useForm({
        defaultValues: {
            kb_knowledge_base: '',
            kb_category: '',
            ...(defaultValues ? { ...defaultValues } : null),
        },
        validators: {
            onSubmit: updateKBArticleSchema,
        },
        onSubmit: async ({ value }) => {
            const userSnowDetails = await getUserSnowDetails();
            const response = await updateKnowledgeArticleMutation.mutateAsync({
                kb_knowledge_base: value.kb_knowledge_base,
                kb_category: value.kb_category,
                short_description: shortDescription,
                text: articleText,
                author: userSnowDetails?.sys_id,
                workflow_state: 'draft',
                number: articleNumber,
            });
            await onSubmitSuccess?.(response);
        },
    });

    const selectedKnowledgeBase = useStore(formInstance.store, (state) => state.values.kb_knowledge_base);
    const isSubmissionInProgress = useStore(formInstance.store, (state) => state.isSubmitting);

    const categoryOptions = useMemo(() => {
        if (!kbCategoriesQuery.data || !selectedKnowledgeBase) return [];
        const categories = kbCategoriesQuery.data[selectedKnowledgeBase] ?? [];
        return categories.map((cat) => ({ value: cat, label: cat }));
    }, [kbCategoriesQuery.data, selectedKnowledgeBase]);

    return (
        <form className="w-full flex flex-col gap-4">
            <div className="relative">
                <div className="flex flex-col gap-2 mt-2 min-h-28">
                    <p className="text-sm text-(--brand-text-gray)">Select the Knowledge Base and Category to save the article.</p>

                    <div className="flex flex-col gap-4 my-5">
                        <div className="flex-1">
                            <formInstance.Field name="kb_knowledge_base" listeners={{ onChange: () => formInstance.setFieldValue('kb_category', '') }}>
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Knowledge Base"
                                        required
                                        disabled={isSubmissionInProgress}
                                        labelClassName={labelClassName}
                                        errorClassName={errorClassName}
                                        errorMinHeight={0}
                                    >
                                        {({ value, onChange, onBlur, hasError, disabled }) => (
                                            <SelectInput
                                                value={(value as string) ?? null}
                                                onChange={onChange as (v: string) => void}
                                                onBlur={onBlur}
                                                error={hasError || kbCategoriesQuery.isError}
                                                disabled={disabled}
                                                options={knowledgeBaseOptions}
                                                isLoading={kbCategoriesQuery.isFetching}
                                                errorMessage={kbCategoriesQuery.isError ? (kbCategoriesQuery.error?.message ?? 'Failed to load options') : undefined}
                                                onRetry={kbCategoriesQuery.isError ? () => kbCategoriesQuery.refetch() : undefined}
                                                onRefetch={() => kbCategoriesQuery.refetch()}
                                                placeholder="Select Knowledge Base"
                                                triggerClassName={selectTriggerClassName}
                                                data-field="kb_knowledge_base"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>

                        <div className="flex-1">
                            <formInstance.Field name="kb_category">
                                {(field) => (
                                    <FormField
                                        field={field}
                                        variant="standard"
                                        label="Category"
                                        required
                                        disabled={!selectedKnowledgeBase || isSubmissionInProgress}
                                        labelClassName={labelClassName}
                                        errorClassName={errorClassName}
                                        errorMinHeight={0}
                                    >
                                        {({ value, onChange, onBlur, hasError, disabled }) => (
                                            <SelectInput
                                                value={(value as string) ?? null}
                                                onChange={onChange as (v: string) => void}
                                                onBlur={onBlur}
                                                error={hasError || kbCategoriesQuery.isError}
                                                disabled={disabled}
                                                options={categoryOptions}
                                                isLoading={kbCategoriesQuery.isFetching}
                                                errorMessage={kbCategoriesQuery.isError ? (kbCategoriesQuery.error?.message ?? 'Failed to load options') : undefined}
                                                onRetry={kbCategoriesQuery.isError ? () => kbCategoriesQuery.refetch() : undefined}
                                                onRefetch={() => kbCategoriesQuery.refetch()}
                                                placeholder={selectedKnowledgeBase ? 'Select Category' : 'Select a Knowledge Base first'}
                                                triggerClassName={selectTriggerClassName}
                                                data-field="kb_category"
                                            />
                                        )}
                                    </FormField>
                                )}
                            </formInstance.Field>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center items-center">
                <formInstance.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                    {({ isSubmitting, canSubmit }) => (
                        <FormActionButton
                            variant="brand"
                            isSubmitting={isSubmitting}
                            disabled={!canSubmit || isSubmitting}
                            onClick={formInstance.handleSubmit}
                            label="Save"
                            submittingLabel="Saving..."
                            icon={<Save size={14} />}
                        />
                    )}
                </formInstance.Subscribe>
            </div>
        </form>
    );
};

export default UpdateKBArticleForm;
