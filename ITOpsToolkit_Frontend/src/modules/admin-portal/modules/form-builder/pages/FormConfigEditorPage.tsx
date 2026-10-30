import React from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import FormConfigEditor from '../components/smart/FormConfigEditor/FormConfigEditor';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import useCreateFormConfigMutation from '../hooks/useCreateFormConfigMutation';
import useUpdateFormConfigMutation from '../hooks/useUpdateFormConfigMutation';
import { FORM_CONFIG_BY_NAME_QUERY_KEY, useFormConfigByNameQuery } from '../hooks/useFormConfigByNameQuery';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import useResetFormConfigToSeederMutation from '../hooks/useResetFormConfigToSeederMutation';
import useDeleteFormConfigMutation from '../hooks/useDeleteFormConfigMutation';

interface FormConfigEditorPageProps {
    mode: 'create' | 'update';
}

const FormConfigEditorPage: React.FC<FormConfigEditorPageProps> = ({ mode }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const createMutation = useCreateFormConfigMutation();
    const updateMutation = useUpdateFormConfigMutation();
    const resetMutation = useResetFormConfigToSeederMutation();
    const deleteMutation = useDeleteFormConfigMutation();

    const { formCode } = useParams({ strict: false }) as { formCode: string };

    // Fetch the specific form config by code when editing
    const formQuery = useFormConfigByNameQuery(formCode);

    const goBack = () => {
        navigate({ to: '/settings/form-management' });
    };

    const handleUpdateSuccess = () => {
        queryClient.invalidateQueries({
            queryKey: [FORM_CONFIG_BY_NAME_QUERY_KEY],
        });
    };

    if (mode === 'update' && formQuery.isLoading) {
        return <ComponentLoadingIndicator />;
    }

    if (mode === 'update' && formQuery.error) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-gray-500">
                <p className="text-red-500">Failed to load form configuration</p>
                <p className="text-xs text-gray-400">{formQuery.error.message}</p>
                <button onClick={goBack} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                    <ArrowLeft size={14} /> Back to Form Management
                </button>
            </div>
        );
    }

    const formRecord = formQuery.data;

    return (
        <div className="flex flex-col">
            {/* Header with back button */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50/80">
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors">
                    <ArrowLeft size={14} />
                    <span>Back to Forms List</span>
                </button>
                <div className="h-4 w-px bg-gray-300" />
                <h2 className="text-xs font-semibold text-(--brand-title-primary-color)">{mode === 'create' ? 'Create New Form' : `Edit: ${formRecord?.name ?? 'Form'}`}</h2>
            </div>

            {/* Editor */}
            <div>
                <FormConfigEditor
                    key={formQuery.dataUpdatedAt}
                    mode={mode}
                    initial={mode === 'update' ? formRecord : undefined}
                    isSubmitting={mode === 'create' ? createMutation.isPending : updateMutation.isPending}
                    onSave={async (data) => {
                        if (mode === 'create') {
                            globalAlertDialogEventBus.emit('show-dialog', {
                                note: 'Feature is not implemented yet !',
                                severity: 'info',
                                title: 'Not Implemented',
                            });
                        } else if (formRecord) {
                            await updateMutation.mutateAsync({ form_name: data.code, form_config: { ...data, id: formRecord?.id, version: formRecord?.version } });
                            handleUpdateSuccess();
                        }
                    }}
                    isResetingToSeeder={resetMutation?.isPending}
                    onResetConfigToSeederLevel={async () => {
                        if (formRecord) {
                            await resetMutation.mutateAsync({
                                form_name: formRecord.code || formCode,
                            });
                            formQuery?.refetch();
                        }
                    }}
                    onDelete={async () => {
                        if (formRecord) {
                            await deleteMutation.mutateAsync({ form_name: formRecord.code || formCode });
                            handleUpdateSuccess();
                            goBack();
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default FormConfigEditorPage;

export const CreateFormConfigPage: React.FC = () => <FormConfigEditorPage mode="create" />;
export const EditFormConfigPage: React.FC = () => <FormConfigEditorPage mode="update" />;
