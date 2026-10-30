import { useFormConfigByNameQuery } from '@/modules/admin-portal/modules/form-builder/hooks/useFormConfigByNameQuery';
import { convertToRuntimeConfig } from '@/modules/admin-portal/modules/form-builder/utils/convert-to-runtime-config';
import type { DraftChangeResponse, PushChangesResponse } from '@/modules/change-ai/types/change-ai';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { DynamicForm, type FormConfig } from '@/shared/modules/dynamic-form';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import logger from '@/shared/utils/logger';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CreateChangeDetailsHybridFormProps {
    draft: DraftChangeResponse;
    cmdb_ci: string;
    attachments: string[];
    onCancel: () => void;
    onCreated?: (result: PushChangesResponse) => void;
}

const CreateChangeDetailsHybridForm: React.FC<CreateChangeDetailsHybridFormProps> = ({ draft, cmdb_ci, attachments, onCancel, onCreated }) => {
    const [createdResult, setCreatedResult] = useState<PushChangesResponse | null>(null);

    const formConfigQuery = useFormConfigByNameQuery('Change Form');

    const formConfigRecord = formConfigQuery.data;

    const meta = useMemo(
        () => ({
            chg_model: draft.change_details.chg_model || '',
            description: draft.change_details.description || '',
            short_description: draft.change_details.short_description,
            implementation_plan: draft.change_details.implementation_plan,
            backout_plan: draft.change_details.backout_plan || '',
            test_plan: draft.change_details.test_plan || '',
            impact_analysis: draft.impact_analysis || '',
            cmdb_ci: cmdb_ci || '',
            start_date: draft.change_details.start_date || '',
            end_date: draft.change_details.end_date || '',
        }),
        [draft, cmdb_ci, attachments],
    );

    const formRunTimeConfig = useMemo((): FormConfig<'create'> | null => {
        if (!formConfigRecord) return null;

        const base = convertToRuntimeConfig(formConfigRecord, {
            mode: 'create',
            meta,
            initialValues: {},
            onCancel,
            classNames: {
                label: 'text-xs text-[var(--brand-title-primary-color)] mb-0.5',
                fieldGrid: 'grid-cols-2 gap-x-1.5 gap-y-2 p-2 pt-2',
                input: 'h-[25px] text-xs font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]',
                textarea: 'h-auto text-xs font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]',
                selectTrigger: 'h-[25px] text-xs font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]',
                error: 'text-xs font-medium text-red-500',
                form: '',
                cancelButton: 'min-w-[50%] btn-split split-red-light shadow text-xs font-medium',
                submitButton: 'min-w-[50%] btn-split split-blue-light shadow text-xs font-medium',
            },
            variant: 'standard',
            onSubmitSuccess: async (_values, _message, responseData) => {
                logger.debug('Change request created successfully', responseData?.result);
                setCreatedResult(responseData?.result as unknown as PushChangesResponse);
                onCreated?.(responseData?.result as unknown as PushChangesResponse);
            },
        });

        return base as FormConfig<'create'>;
    }, [formConfigRecord, meta, draft, cmdb_ci, attachments]);

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

    if (!formRunTimeConfig) {
        return <DynamicForm formId={'No Form'} config={{ fields: [], mode: 'create', onSubmit: async () => ({ message: '' }) }} />;
    }

    return (
        <ShellLayout className="rounded">
            <ShellLayout.Header>
                <TitleWithArraow title="CREATE CHANGE DETAILS" />
            </ShellLayout.Header>
            <ShellLayout.Body className="p-2">
                <DynamicForm<'create'>
                    formId={formConfigRecord?.code || ''}
                    key={`${draft.change_details.short_description}-${draft.change_details.start_date}-${draft.change_details.end_date}`}
                    config={formRunTimeConfig}
                ></DynamicForm>
            </ShellLayout.Body>
        </ShellLayout>
    );
};

export default CreateChangeDetailsHybridForm;
