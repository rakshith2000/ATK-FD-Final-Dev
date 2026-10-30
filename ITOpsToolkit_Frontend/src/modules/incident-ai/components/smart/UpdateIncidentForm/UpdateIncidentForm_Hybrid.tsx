import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { DynamicForm } from '@/shared/modules/dynamic-form';
import type { FormConfig, FormImperativeHandle } from '@/shared/modules/dynamic-form/types';
import { useQuery } from '@tanstack/react-query';
import { convertToRuntimeConfig, fetchRawInitialValues, getInitialValuesQueryKey } from '@/modules/admin-portal/modules/form-builder/utils/convert-to-runtime-config';
import type { SnowTicket } from '../../../../../shared/modules/servicenow/types/ticket';
import { useFormConfigByNameQuery } from '@/modules/admin-portal/modules/form-builder/hooks/useFormConfigByNameQuery';
import { useTicketFormQueries, type UnifiedHistoryEntry } from '../../../../../shared/modules/servicenow/hooks/useTicketFormQueries';
import { twMerge } from 'tailwind-merge';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import { appConfig } from '@/config/app-config';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

export type UpdateIncidentFormImperativeHandle = FormImperativeHandle;

interface UpdateIncidentFormProps {
    incidentId: string;
    incidentData: SnowTicket;
    onDirtyChange?: (isDirty: boolean) => void;
    onSubmitSuccess?: ({ updatedIncidentResponse, incidentId }: { incidentId: string; updatedIncidentResponse: SnowTicket }) => Promise<void>;
    onIncidentStateChange?: (incidentState: string) => Promise<void>;
    imperativeRef?: React.Ref<UpdateIncidentFormImperativeHandle>;
    isExternalLoading?: boolean;
    isTechAssistPending?: boolean;
    externalLoadingMessage?: string;
    isExternalError?: boolean;
    externalErrorRetryLabel?: string;
    externalError?: Error | null;
    handleExternalErrorRetry?: () => void;
    enableAuditEntries?: boolean;
}

const UpdateIncidentForm: React.FC<UpdateIncidentFormProps> = ({
    incidentId,
    onDirtyChange,
    onSubmitSuccess,
    onIncidentStateChange,
    imperativeRef,
    externalError,
    isExternalError,
    isExternalLoading,
    isTechAssistPending,
    handleExternalErrorRetry,
    enableAuditEntries = false,
}) => {
    const onIncidentStateChangeRef = useRef(onIncidentStateChange);
    onIncidentStateChangeRef.current = onIncidentStateChange;

    const [showJournalEntries, setShowJournalEntries] = useState(false);
    const journalEntriesRef = useRef<HTMLDivElement>(null);

    const formConfigQuery = useFormConfigByNameQuery('Incident Form');
    const formConfigRecord = formConfigQuery.data;

    const meta = useMemo(() => ({ ticketType: 'incident', ticketId: incidentId }), [incidentId]);

    const needsInitialValues = !!formConfigRecord?.initialValuesConfig?.url;
    const initialValuesQuery = useQuery({
        queryKey: formConfigRecord ? getInitialValuesQueryKey(formConfigRecord, meta) : ['initial-values-disabled'],
        queryFn: () => fetchRawInitialValues(formConfigRecord!, meta),
        enabled: needsInitialValues && !!formConfigRecord,
        staleTime: 0,
        gcTime: 0,
    });

    const { ticketJournalEntries, journalEntriesList } = useTicketFormQueries({
        ticketType: 'incident',
        ticketId: incidentId,
        shouldLoadJournalEntries: showJournalEntries,
        enableAuditEntries,
    });

    const config = useMemo((): FormConfig<'update'> | null => {
        if (!formConfigRecord) return null;

        const base = convertToRuntimeConfig(formConfigRecord, {
            mode: 'update',
            meta,
            initialValues: initialValuesQuery.data ?? undefined,
            classNames: {
                label: 'text-[0.65rem] text-[var(--brand-title-primary-color)] mb-0.5',
                fieldGrid: 'grid-cols-2 gap-x-1.5 gap-y-2 p-2 pt-2',
                input: 'h-[25px] text-[0.65rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]',
                textarea: 'h-auto text-[0.65rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]',
                selectTrigger: 'h-[25px] text-[0.65rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]',
                error: 'text-[0.65rem] font-medium text-red-500',
                form: 'brand-box-show-inset',
            },
            variant: 'standard',
            onDirtyChange,
            onSubmitSuccess: async (_values, _message, responseData) => {
                const updatedIncidentResponse = ((responseData?.result as Record<string, unknown>) ?? responseData ?? {}) as unknown as SnowTicket;
                await onSubmitSuccess?.({ updatedIncidentResponse, incidentId });
                initialValuesQuery.refetch();
                ticketJournalEntries.refetch();
            },
            ...(appConfig?.isInDemoEnvironment
                ? {
                      onSubmit: async (values) => {
                          globalAlertDialogEventBus.emit('show-dialog', {
                              note: appConfig.demoEnvironmentActionMessage,
                              severity: 'info',
                              title: 'DEMO',
                          });

                          const demoMockData: SnowTicket = {};

                          for (const key of Object.keys(values)) {
                              demoMockData[key] = {
                                  display_value: (values[key] as unknown as string) ?? '',
                                  value: (values[key] as unknown as string) ?? '',
                              };
                          }

                          return { message: appConfig.demoEnvironmentActionMessage, responseData: demoMockData };
                      },
                  }
                : {}),
        });

        for (const field of base.fields) {
            switch (field.name) {
                case 'state': {
                    if (isTechAssistPending) field.disabled = true;
                    const configOnChange = field.onChange;
                    field.onChange = (value, formApi) => {
                        configOnChange?.(value, formApi);
                        onIncidentStateChangeRef.current?.(value as string);
                    };
                    break;
                }
            }
        }

        return base as FormConfig<'update'>;
    }, [formConfigRecord, incidentId, meta, onDirtyChange, onSubmitSuccess, isTechAssistPending, initialValuesQuery.data]);

    const toggleJournalEntries = () => {
        const next = !showJournalEntries;
        setShowJournalEntries(next);
        if (next) {
            setTimeout(() => {
                journalEntriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    };

    if (!config) {
        return (
            <DynamicForm
                formId={'No Form'}
                config={{ fields: [], mode: 'update', onSubmit: async () => ({ message: '' }) }}
                isExternalLoading={formConfigQuery.isLoading || (needsInitialValues && (initialValuesQuery.isLoading || initialValuesQuery.isFetching))}
                isExternalError={formConfigQuery.isError || (needsInitialValues && initialValuesQuery.isError)}
                externalError={formConfigQuery.error ?? initialValuesQuery.error}
                externalErrorRetry={() => {
                    if (formConfigQuery.isError) formConfigQuery.refetch();
                    else initialValuesQuery.refetch();
                }}
                isExternalErrorRetrying={formConfigQuery.isRefetching || initialValuesQuery.isRefetching}
            />
        );
    }

    return (
        <DynamicForm
            key={`${incidentId}-${initialValuesQuery.dataUpdatedAt}`}
            config={config}
            formId={formConfigRecord?.code ?? ''}
            formRef={imperativeRef}
            isExternalLoading={isExternalLoading || formConfigQuery.isLoading || (needsInitialValues && (initialValuesQuery.isLoading || initialValuesQuery.isFetching))}
            isExternalError={isExternalError || formConfigQuery.isError || (needsInitialValues && initialValuesQuery.isError)}
            externalError={externalError ?? formConfigQuery.error ?? initialValuesQuery.error}
            externalErrorRetry={() => {
                if (formConfigQuery.isError) formConfigQuery.refetch();
                else if (initialValuesQuery.isError) initialValuesQuery.refetch();
                else handleExternalErrorRetry?.();
            }}
            isExternalErrorRetrying={formConfigQuery.isRefetching || initialValuesQuery.isRefetching}
        >
            {/* Journal Entries */}
            <div className="col-span-2 px-3 mb-5" ref={journalEntriesRef}>
                <div className="flex items-center justify-between gap-2">
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
                    {showJournalEntries && <RefetchButton className="pt-2 " onRefetch={() => ticketJournalEntries.refetch()} isRefetching={ticketJournalEntries.isRefetching} />}
                </div>

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
                                <button type="button" onClick={() => ticketJournalEntries.refetch()} className="flex items-center gap-0.5 text-blue-500 underline cursor-pointer">
                                    <RefreshCw size={10} /> Retry
                                </button>
                            </div>
                        )}

                        {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && journalEntriesList.length === 0 && (
                            <div className="text-xs text-gray-400">No notes found.</div>
                        )}

                        {!ticketJournalEntries.isLoading && !ticketJournalEntries.isError && journalEntriesList.length > 0 && (
                            <>
                                {journalEntriesList.map((entry: UnifiedHistoryEntry, index: number) => {
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
                                    <div className="flex flex-col items-center gap-1 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => ticketJournalEntries.fetchNextPage()}
                                            className="text-xs px-4 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                                            disabled={ticketJournalEntries.isFetchingNextPage}
                                        >
                                            {ticketJournalEntries.isFetchingNextPage ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </DynamicForm>
    );
};

export default UpdateIncidentForm;
