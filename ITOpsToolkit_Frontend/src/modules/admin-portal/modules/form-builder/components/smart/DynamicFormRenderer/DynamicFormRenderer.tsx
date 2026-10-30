import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DynamicForm } from '@/shared/modules/dynamic-form';
import { convertToRuntimeConfig, fetchRawInitialValues, getInitialValuesQueryKey } from '../../../utils/convert-to-runtime-config';
import type { FormConfigRecord } from '../../../types/form-config';
import type { FormClassNames } from '@/shared/modules/dynamic-form/types';
import logger from '@/shared/utils/logger';

interface DynamicFormRendererProps {
    /** The form config record - pass the full record directly from the DB/API.
     *  All FormConfigRecord properties (fields, mode, submitConfig, initialValuesConfig,
     *  submitWithValues, trackDirty, variant, submitGuards, etc.) are forwarded automatically. */
    record: FormConfigRecord;
    /** Runtime meta object for URL template resolution in async options, submit, and initial values. */
    meta?: Record<string, unknown>;
    /** Override default class names for form layout and field styling */
    classNames?: FormClassNames;
    /** Additional class name for the outer wrapper div */
    className?: string;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({ record, meta, classNames, className }) => {
    const formMode = record.mode ?? 'create';
    const needsInitialValues = !!record.initialValuesConfig?.url && (formMode === 'update' || formMode === 'delete' || formMode === 'view');

    const initialValuesQuery = useQuery({
        queryKey: getInitialValuesQueryKey(record, meta),
        queryFn: () => fetchRawInitialValues(record, meta),
        enabled: needsInitialValues,
        staleTime: 0,
        gcTime: 0,
    });

    const config = useMemo(() => {
        const options: Parameters<typeof convertToRuntimeConfig>[1] = {
            mode: formMode,
            meta,
            classNames,
            initialValues: initialValuesQuery.data ?? undefined,
        };
        // Only override onSubmit with preview logger when there's no submitConfig -
        // when submitConfig exists, let convertToRuntimeConfig generate the real onSubmit
        if (!record.submitConfig) {
            options.onSubmit = async (values) => {
                logger.debug('Preview submit:', values);
                return { message: 'Preview - form submitted successfully!' };
            };
        }
        return convertToRuntimeConfig(record, options);
    }, [record, formMode, meta, classNames, initialValuesQuery.data]);

    if (record.fields.length === 0) {
        return <div className="flex items-center justify-center h-40 text-xs text-gray-400">Add fields to see a preview</div>;
    }

    return (
        <div className={`max-w-200 mx-auto shadow rounded border border-gray-100${className ? ` ${className}` : ''}`}>
            <DynamicForm
                key={initialValuesQuery.dataUpdatedAt}
                formId={record.code}
                config={config}
                isExternalLoading={needsInitialValues && initialValuesQuery.isLoading}
                isExternalError={needsInitialValues && initialValuesQuery.isError}
                externalError={initialValuesQuery.error}
                externalErrorRetry={initialValuesQuery.refetch}
                isExternalErrorRetrying={initialValuesQuery.isRefetching}
            />
        </div>
    );
};

export default DynamicFormRenderer;
