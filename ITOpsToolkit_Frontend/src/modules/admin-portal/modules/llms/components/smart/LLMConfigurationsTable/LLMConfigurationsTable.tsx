import { HighlightedText, VirtualTable, type VirtualTableColumnDef } from '@/shared/modules/virtual-table';
import React, { useCallback, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { LLM } from '@/modules/admin-portal/modules/llms/types/llms';
import { useLLMsListWithConfigQuery } from '@/modules/admin-portal/modules/llms/hooks/useLLMsListWithConfigQuery';
import logger from '@/shared/utils/logger';
import { IoMdAdd } from 'react-icons/io';
import LLMForm from '../LLMForm/LLMForm';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import { useQueryClient } from '@tanstack/react-query';
import { updateQueriesData } from '@/shared/utils/query-data-updater';
import FormActionModal from '@/shared/components/ui/FormActionModal/FormActionModal';
import { SiGooglegemini } from 'react-icons/si';
import { FaAws } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import type { IconType } from 'react-icons';
import { FiKey } from 'react-icons/fi';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import CopyText from '@/shared/components/ui/CopyText/CopyText';

dayjs.extend(utc);

const LLMConfigurationsTable: React.FC = () => {
    const queryClient = useQueryClient();

    const llmsListQuery = useLLMsListWithConfigQuery();

    const llms = llmsListQuery.data ?? [];

    const [showOnboardLLmModal, setShowOnboardLLMModal] = useState(false);
    const [deleteLLM, setDeleteLLM] = useState<LLM | null>(null);
    const [viewLLM, setViewLLM] = useState<LLM | null>(null);

    const columns = useMemo<VirtualTableColumnDef<LLM>[]>(
        () => [
            ...dataColumns,
            {
                id: '__actions',
                header: 'Actions',
                size: 70,
                minSize: 70,
                maxSize: 70,
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                enableResizing: true,
                meta: {
                    label: 'Actions',
                },
                cell: ({ row }) => {
                    return (
                        <div className="flex items-center justify-center gap-2 p-0.5">
                            <FormActionButton
                                isSubmitting={false}
                                label=""
                                title="Delete LLM"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteLLM(row?.original);
                                }}
                                submittingLabel=""
                                variant="danger"
                                icon={<Trash2 size={12} />}
                                className="min-w-min rounded"
                            />
                        </div>
                    );
                },
            } as VirtualTableColumnDef<LLM>,
        ],
        [],
    );

    const handleLLMOnboardSuccess = useCallback(
        (newLLM: LLM) => {
            updateQueriesData<Array<LLM>>(queryClient, {
                queryKeyFilter: (queryKey) => queryKey[0] === llmsListQuery.queryKey[0],
                updater: (prev) => {
                    if (!prev) return [newLLM];
                    return [newLLM, ...prev];
                },
            });
        },
        [queryClient],
    );

    const handleLLMDeleteSuccess = useCallback(
        (deletedLlmTag: string) => {
            logger.debug({ deletedLlmTag });
            updateQueriesData<Array<LLM>>(queryClient, {
                queryKeyFilter: (queryKey) => queryKey[0] === llmsListQuery.queryKey[0],
                updater: (prev) => {
                    if (!prev) return prev;
                    return prev.filter((llm) => llm.llm_tag !== deletedLlmTag);
                },
            });
        },
        [queryClient],
    );

    return (
        <div className="flex max-h-full min-h-0 flex-col">
            <VirtualTable
                columns={columns}
                data={llms}
                getRowId={(row) => row.llm_tag}
                isLoading={llmsListQuery.isLoading}
                error={llmsListQuery.error}
                isRetrying={llmsListQuery.isRefetching}
                retryLabel="Reload"
                emptyTitle="No LLMs found"
                emptyMessage="Try adjusting filters and check!"
                onRetry={llmsListQuery.refetch}
                onDeleteRow={handleLLMDeleteSuccess}
                enableSorting
                onRowClick={(llm, e) => {
                    e.stopPropagation();
                    setViewLLM(llm);
                }}
                enableColumnFilters
                enableGlobalFilter
                initialFiltersVisible={false}
                initialColumnVisibility={{
                    llm_type: true,
                    llm_tag: true,
                    llm_config: true,
                    updated_by: true,
                    updated_at: true,
                }}
                initialSorting={[{ id: 'updated_at', desc: true }]}
                classNames={{
                    tbodyCell: 'py-1 text-xs 2xl:text-sm',
                    theadCell: 'py-1.5 text-xs font-semibold bg-blue-50 text-(--brand-title-primary-color) 2xl:text-sm',
                    filterCell: 'text-[0.7rem]',
                    toolbar: 'pb-2 pt-1 px-1.5',
                    theadRow: 'bg-white',
                    thead: 'bg-white',
                    tableWrapper: 'h-auto max-h-full rounded-none overflow-auto',
                    sortIcon: 'text-(--brand-title-primary-color) text-xs',
                }}
            >
                <VirtualTable.Toolbar className="bg-(--brand-color) p-2 text-sm">
                    <div className="flex flex-row items-center justify-center gap-1 text-(--brand-text-inverse)">
                        <h1 className="text-xs font-semibold tracking-wider">LLM Configurations</h1>
                    </div>

                    <div className="flex-1" />

                    <button
                        className="flex flex-row justify-center items-center gap-1 text-xs cursor-pointer rounded-full bg-(--brand-text-inverse)/10 hover:bg-(--brand-text-inverse)/15 px-3 py-1 text-(--brand-text-inverse) shadow-[0_0px_1px_0px_var(--brand-text-inverse)]"
                        onClick={() => setShowOnboardLLMModal(true)}
                    >
                        <IoMdAdd size={16} />
                        <span>Onboard New LLM</span>
                    </button>
                    <VirtualTable.RowInfo
                        className="rounded-full bg-(--brand-text-inverse)/10 px-3 py-1 text-(--brand-text-inverse) shadow-[0_0px_1px_0px_var(--brand-text-inverse)]"
                        rowsAlias=" LLMs"
                    />

                    <VirtualTable.GlobalSearch
                        placeholder="Search LLMs..."
                        className="rounded-full bg-(--brand-text-inverse)/10 px-3 py-0 text-(--brand-text-inverse) shadow-[0_0px_1px_0px_var(--brand-text-inverse)]"
                        childrenClassNames={{
                            clearIcon: 'text-inherit hover:text-inherit',
                            searchIcon: 'text-inherit',
                            input: 'border-none bg-transparent text-inherit placeholder:text-(--brand-text-inverse)/40 focus:ring-0',
                        }}
                    />

                    <VirtualTable.ColumnConfig
                        triggerClassName={twMerge(
                            'bg-(--brand-text-inverse)/10',
                            'shadow-[0_0px_1px_0px_var(--brand-text-inverse)]',
                            'text-(--brand-text-inverse)',
                            'border-none',
                            'py-1 px-3',
                            'rounded-full',
                            'hover:bg-(--brand-text-inverse)/15',
                            'hover:text-(--brand-text-inverse)',
                            'focus:ring-0',
                        )}
                    />
                    <RefetchButton isRefetching={llmsListQuery.isRefetching} onRefetch={llmsListQuery.refetch} iconSize={18} className="text-(--brand-text-inverse)" />
                </VirtualTable.Toolbar>

                <VirtualTable.Content />
            </VirtualTable>
            {/* Create Modal */}
            <FormActionModal
                key={String(showOnboardLLmModal)}
                open={showOnboardLLmModal}
                onClose={() => setShowOnboardLLMModal(false)}
                title="Onboard LLM"
                formSize="2xl"
                successSize="md"
                successConfig={{ title: 'New LLM onboarded successfully' }}
            >
                {({ onSuccess, setCanClose, setOverlay }) => (
                    <LLMForm
                        mode="create"
                        setCanClose={setCanClose}
                        setOverlay={setOverlay}
                        onSubmitSuccess={async (response) => {
                            onSuccess({ successMessage: response.message });
                            handleLLMOnboardSuccess(response.formDataWhileSubmitting);
                            llmsListQuery.refetch();
                            logger.debug(response);
                        }}
                    />
                )}
            </FormActionModal>
            {/* View LLM Modal */}
            <FormActionModal
                key={viewLLM ? `View-${viewLLM.llm_tag}` : 'view-llm-modal'}
                open={!!viewLLM}
                onClose={() => setViewLLM(null)}
                title="LLM Details"
                formSize="2xl"
                successSize="md"
            >
                {() => (
                    <LLMForm
                        mode="view"
                        initialValues={
                            viewLLM
                                ? {
                                      associated_agents_or_tools: viewLLM?.associated_agents_or_tools ?? [],
                                      llm_config: viewLLM?.llm_config,
                                      llm_tag: viewLLM?.llm_tag,
                                      llm_type: viewLLM?.llm_type,
                                  }
                                : {}
                        }
                    />
                )}
            </FormActionModal>
            {/* Delete LLM Modal */}
            <FormActionModal
                key={deleteLLM ? `Delete-${deleteLLM.llm_tag}` : 'delete-llm-modal'}
                open={!!deleteLLM}
                onClose={() => setDeleteLLM(null)}
                title="Delete LLM"
                formSize="2xl"
                successSize="md"
                successConfig={{ title: 'LLM deleted successfully' }}
            >
                {({ onSuccess, setCanClose, setOverlay }) => (
                    <LLMForm
                        mode="delete"
                        setCanClose={setCanClose}
                        setOverlay={setOverlay}
                        initialValues={
                            deleteLLM
                                ? {
                                      associated_agents_or_tools: deleteLLM?.associated_agents_or_tools ?? [],
                                      llm_config: deleteLLM?.llm_config,
                                      llm_tag: deleteLLM?.llm_tag,
                                      llm_type: deleteLLM?.llm_type,
                                  }
                                : {}
                        }
                        onSubmitSuccess={async (response) => {
                            onSuccess({ successMessage: response.message });
                            handleLLMDeleteSuccess(response.formDataWhileSubmitting.llm_tag);
                            llmsListQuery.refetch();
                            logger.debug({ response });
                        }}
                    />
                )}
            </FormActionModal>
        </div>
    );
};

const llmTypeConfig: Record<string, { bg: string; text: string; dot: string; border: string; icon: IconType }> = {
    'AWS Nova': {
        bg: 'bg-gradient-to-r from-[#F8FAFC] via-[#F1F5F9] to-[#E5E7EB]',
        text: 'text-[#232F3E]',
        dot: 'bg-gradient-to-br from-[#232F3E] via-[#37475A] to-[#6B7280]',
        border: 'border-[#CBD5E1]',
        icon: FaAws,
    },
    'Azure OpenAI': {
        bg: 'bg-gradient-to-r from-[#F0F7FF] via-[#E5F1FB] to-[#DDF6FF]',
        text: 'text-[#0078D4]',
        dot: 'bg-gradient-to-br from-[#0078D4] via-[#0066B8] to-[#00A4EF]',
        border: 'border-[#B3D8F5]',
        icon: VscAzure,
    },
    'Google Gemini': {
        bg: 'bg-gradient-to-r from-blue-50 via-violet-100 to-pink-100',
        text: 'text-violet-900',
        dot: 'bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500',
        border: 'border-violet-300',
        icon: SiGooglegemini,
    },
};

const fallbackTypeConfig = {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-300',
    border: 'border-gray-200',
    icon: FiKey,
};

const dataColumns: VirtualTableColumnDef<LLM>[] = [
    {
        id: 'llm_tag',
        accessorKey: 'llm_tag',
        header: 'LLM Tag',
        size: 160,
        minSize: 160,
        maxSize: 220,
        enableGlobalFilter: true,
        cell: ({ getValue, row, column }) => {
            const tag = getValue<string>();
            const type = row.original.llm_type;
            const config = llmTypeConfig[type] ?? fallbackTypeConfig;

            return (
                <div className="flex items-start gap-2 min-w-0">
                    <span className={twMerge('size-2 shrink-0 rounded-full mt-2', config.dot)} />

                    <CopyText text={tag} className="flex-1 min-w-0" textClassName="text-xs font-semibold text-(--brand-title-primary-color)">
                        {({ text }) => (
                            <span className="text-xs font-semibold text-(--brand-title-primary-color)">
                                <HighlightedText text={text} columnId={column.id} highlightGlobal />
                            </span>
                        )}
                    </CopyText>
                </div>
            );
        },
    },
    {
        id: 'llm_type',
        accessorKey: 'llm_type',
        header: 'LLM Type',
        size: 150,
        minSize: 150,
        maxSize: 200,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const type = getValue<string>();
            const config = llmTypeConfig[type] ?? fallbackTypeConfig;
            const Icon = config.icon;

            return (
                <span className={twMerge('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[0.65rem] font-semibold', config.bg, config.text, config.border)}>
                    <Icon size={13} />
                    <HighlightedText text={type} columnId={column.id} highlightGlobal />
                </span>
            );
        },
    },
    {
        id: 'llm_config',
        accessorFn: (row) => JSON.stringify(row.llm_config),
        header: 'LLM Config',
        size: 540,
        minSize: 540,
        maxSize: 540,
        enableSorting: false,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        cell: ({ getValue, column }) => {
            let config = getValue<string | undefined>();
            config = config ? JSON.parse(config) : undefined;
            const typeConfig = fallbackTypeConfig;

            if (!config || Object.keys(config).length === 0) {
                return <span className="text-[0.65rem] italic text-(--brand-text-gray)">-</span>;
            }

            return (
                <div className="flex flex-wrap gap-1.5 py-2">
                    {Object.entries(config).map(([key, value]) => (
                        <div key={key} title={`${key}: ${value}`} className={twMerge('flex items-center gap-1.5 rounded-md border px-2 py-0.5', typeConfig.bg, typeConfig.border)}>
                            <span className={twMerge('text-[0.6rem] font-bold tracking-wide', typeConfig.text)}>
                                <HighlightedText text={key} columnId={column.id} highlightGlobal />
                            </span>

                            <span className={twMerge('h-2.5 w-px', typeConfig.dot)} />

                            <span className={twMerge('max-w-80 truncate text-[0.6rem] font-medium opacity-70', typeConfig.text)}>
                                <HighlightedText text={value} columnId={column.id} highlightGlobal />
                            </span>
                        </div>
                    ))}
                </div>
            );
        },
    },
    {
        id: 'associated_agents_or_tools',
        accessorFn: (row) =>
            JSON.stringify(
                row.associated_agents_or_tools?.reduce((acc: Record<string, string>, curr: string, index: number) => {
                    acc[`${index + 1}`] = curr;

                    return acc;
                }, {}),
            ),
        header: 'Associated Agents or Tools',
        size: 540,
        minSize: 540,
        maxSize: 540,
        enableSorting: false,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        cell: ({ getValue, column }) => {
            let config = getValue<string | undefined>();
            config = config ? JSON.parse(config) : undefined;
            const typeConfig = fallbackTypeConfig;

            if (!config || Object.keys(config).length === 0) {
                return <span className="text-[0.65rem] italic text-(--brand-text-gray)">-</span>;
            }

            return (
                <div className="flex flex-wrap gap-1.5 py-2">
                    {Object.entries(config).map(([key, value]) => (
                        <div key={key} title={`${key}: ${value}`} className={twMerge('flex items-center gap-1.5 rounded-md border px-2 py-0.5', typeConfig.bg, typeConfig.border)}>
                            <span className={twMerge('text-[0.6rem] font-bold tracking-wide', typeConfig.text)}>
                                <HighlightedText text={key} columnId={column.id} highlightGlobal />
                            </span>

                            <span className={twMerge('h-2.5 w-px', typeConfig.dot)} />

                            <span className={twMerge('max-w-80 truncate text-[0.6rem] font-medium opacity-70', typeConfig.text)}>
                                <HighlightedText text={value} columnId={column.id} highlightGlobal />
                            </span>
                        </div>
                    ))}
                </div>
            );
        },
    },
    {
        id: 'updated_by',
        accessorKey: 'updated_by',
        header: 'Updated By',
        size: 180,
        minSize: 140,
        maxSize: 220,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const email = getValue<string>() ?? '';
            const handle = email.includes('@') ? email.split('@')[0] : email;
            const displayName = handle.replaceAll('_', ' ');

            return (
                <span className="truncate text-xs font-normal text-(--brand-title-primary-color)">
                    <HighlightedText text={displayName} columnId={column.id} highlightGlobal />
                </span>
            );
        },
    },
    {
        id: 'updated_at',
        accessorFn: (row) => dayjs.utc(row.updated_at).local().format('DD MMM YYYY, h:mm:ss A'),
        header: 'Updated At',
        size: 180,
        minSize: 140,
        maxSize: 220,
        enableSorting: true,
        sortingFn: (rowA, rowB, columnId) => {
            return new Date(rowA.getValue(columnId)).getTime() - new Date(rowB.getValue(columnId)).getTime();
        },
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const updatedAt = getValue<string>();

            return (
                <span className="whitespace-wrap text-xs font-normal text-(--brand-title-primary-color)">
                    <HighlightedText text={updatedAt} columnId={column.id} highlightGlobal />
                </span>
            );
        },
    },
];

export default LLMConfigurationsTable;
