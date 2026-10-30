import { HighlightedText, VirtualTable, type VirtualTableColumnDef } from '@/shared/modules/virtual-table';
import React, { useCallback, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { IoMdAdd } from 'react-icons/io';
import { useQueryClient } from '@tanstack/react-query';
import { updateQueriesData } from '@/shared/utils/query-data-updater';
import FormActionModal from '@/shared/components/ui/FormActionModal/FormActionModal';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import logger from '@/shared/utils/logger';
import type { ITSMConnector } from '@/modules/admin-portal/modules/itsm-connectors/types/itsm-connectors';
import { useITSMConnectorsListQuery } from '@/modules/admin-portal/modules/itsm-connectors/hooks/useITSMConnectorsListQuery';
import ITSMConnectorForm from '../ITSMConnectorForm/ITSMConnectorForm';

const ITSMConnectorsTable: React.FC = () => {
    const queryClient = useQueryClient();

    const itsmListQuery = useITSMConnectorsListQuery();

    const connectors = itsmListQuery.data ?? [];

    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [deleteConnector, setDeleteConnector] = useState<ITSMConnector | null>(null);
    const [viewConnector, setViewConnector] = useState<ITSMConnector | null>(null);

    const columns = useMemo<VirtualTableColumnDef<ITSMConnector>[]>(
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
                meta: { label: 'Actions' },
                cell: ({ row }) => (
                    <div className="flex items-center justify-center gap-2 p-0.5">
                        <FormActionButton
                            isSubmitting={false}
                            label=""
                            title="Delete ITSM Connector"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConnector(row.original);
                            }}
                            submittingLabel=""
                            variant="danger"
                            icon={<Trash2 size={12} />}
                            className="min-w-min rounded"
                        />
                    </div>
                ),
            } as VirtualTableColumnDef<ITSMConnector>,
        ],
        [],
    );

    const handleOnboardSuccess = useCallback(
        (newConnector: ITSMConnector) => {
            updateQueriesData<Array<ITSMConnector>>(queryClient, {
                queryKeyFilter: (queryKey) => queryKey[0] === itsmListQuery.queryKey[0],
                updater: (prev) => {
                    if (!prev) return [newConnector];
                    return [newConnector, ...prev];
                },
            });
        },
        [queryClient, itsmListQuery.queryKey],
    );

    const handleDeleteSuccess = useCallback(
        (deletedItsmTag: string) => {
            logger.debug({ deletedItsmTag });
            updateQueriesData<Array<ITSMConnector>>(queryClient, {
                queryKeyFilter: (queryKey) => queryKey[0] === itsmListQuery.queryKey[0],
                updater: (prev) => {
                    if (!prev) return prev;
                    return prev.filter((c) => c.itsm_tag !== deletedItsmTag);
                },
            });
        },
        [queryClient, itsmListQuery.queryKey],
    );

    return (
        <div className="flex max-h-full min-h-0 flex-col">
            <VirtualTable
                columns={columns}
                data={connectors}
                getRowId={(row) => row.itsm_tag}
                isLoading={itsmListQuery.isLoading}
                error={itsmListQuery.error}
                isRetrying={itsmListQuery.isRefetching}
                retryLabel="Reload"
                emptyTitle="No ITSM connectors found"
                emptyMessage="Try adjusting filters and check!"
                onRetry={itsmListQuery.refetch}
                onDeleteRow={handleDeleteSuccess}
                enableSorting
                onRowClick={(connector, e) => {
                    e.stopPropagation();
                    setViewConnector(connector);
                }}
                enableColumnFilters
                enableGlobalFilter
                initialFiltersVisible={false}
                initialColumnVisibility={{
                    itsm_type: true,
                    itsm_tag: true,
                    updated_by: true,
                }}
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
                        <h1 className="text-xs font-semibold tracking-wider">ITSM Connectors</h1>
                    </div>

                    <div className="flex-1" />

                    <button
                        className="flex flex-row justify-center items-center gap-1 text-xs cursor-pointer rounded-full bg-(--brand-text-inverse)/10 hover:bg-(--brand-text-inverse)/15 px-3 py-1 text-(--brand-text-inverse) shadow-[0_0px_1px_0px_var(--brand-text-inverse)]"
                        onClick={() => setShowOnboardModal(true)}
                    >
                        <IoMdAdd size={16} />
                        <span>Onboard New Connector</span>
                    </button>

                    <VirtualTable.RowInfo
                        className="rounded-full bg-(--brand-text-inverse)/10 px-3 py-1 text-(--brand-text-inverse) shadow-[0_0px_1px_0px_var(--brand-text-inverse)]"
                        rowsAlias=" Connectors"
                    />

                    <VirtualTable.GlobalSearch
                        placeholder="Search connectors..."
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

                    <RefetchButton isRefetching={itsmListQuery.isRefetching} onRefetch={itsmListQuery.refetch} iconSize={18} className="text-(--brand-text-inverse)" />
                </VirtualTable.Toolbar>

                <VirtualTable.Content />
            </VirtualTable>

            {/* Onboard Modal */}
            <FormActionModal
                key={String(showOnboardModal)}
                open={showOnboardModal}
                onClose={() => setShowOnboardModal(false)}
                title="Onboard ITSM Connector"
                formSize="2xl"
                successSize="md"
                successConfig={{ title: 'New ITSM connector onboarded successfully' }}
            >
                {({ onSuccess, setOverlay, setCanClose }) => (
                    <ITSMConnectorForm
                        mode="create"
                        setOverlay={setOverlay}
                        setCanClose={setCanClose}
                        onSubmitSuccess={async (response) => {
                            onSuccess({ successMessage: response.message });
                            handleOnboardSuccess({
                                itsm_tag: response.formDataWhileSubmitting.itsm_tag,
                                itsm_type: response.formDataWhileSubmitting.itsm_type,
                                updated_by: '',
                            });
                            itsmListQuery.refetch();
                            logger.debug(response);
                        }}
                    />
                )}
            </FormActionModal>

            {/* View Modal */}
            <FormActionModal
                key={viewConnector ? `view-${viewConnector.itsm_tag}` : 'view-itsm-modal'}
                open={!!viewConnector}
                onClose={() => setViewConnector(null)}
                title="ITSM Connector Details"
                formSize="2xl"
                successSize="md"
            >
                {({ setOverlay }) => <ITSMConnectorForm mode="view" setOverlay={setOverlay} initialValues={viewConnector ?? {}} />}
            </FormActionModal>

            {/* Delete Modal */}
            <FormActionModal
                key={deleteConnector ? `delete-${deleteConnector.itsm_tag}` : 'delete-itsm-modal'}
                open={!!deleteConnector}
                onClose={() => setDeleteConnector(null)}
                title="Delete ITSM Connector"
                formSize="2xl"
                successSize="md"
                successConfig={{ title: 'ITSM connector deleted successfully' }}
            >
                {({ onSuccess, setOverlay, setCanClose }) => {
                    return (
                        <ITSMConnectorForm
                            mode="delete"
                            setOverlay={setOverlay}
                            setCanClose={setCanClose}
                            initialValues={deleteConnector ?? {}}
                            onSubmitSuccess={async (response) => {
                                onSuccess({ successMessage: response.message });
                                handleDeleteSuccess(response.formDataWhileSubmitting.itsm_tag);
                                itsmListQuery.refetch();
                                logger.debug({ response });
                            }}
                        />
                    );
                }}
            </FormActionModal>
        </div>
    );
};

const dataColumns: VirtualTableColumnDef<ITSMConnector>[] = [
    {
        id: 'itsm_tag',
        accessorKey: 'itsm_tag',
        header: 'ITSM Tag',
        size: 160,
        minSize: 160,
        maxSize: 220,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const value = getValue<string>();
            return (
                <div className="flex items-start gap-2 min-w-0">
                    <span className={twMerge('size-2 shrink-0 rounded-full mt-2 bg-(--brand-color)')} />
                    <CopyText text={value} className="flex-1 min-w-0" textClassName="text-xs font-semibold text-(--brand-title-primary-color)">
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
        id: 'itsm_type',
        accessorKey: 'itsm_type',
        header: 'ITSM Type',
        size: 150,
        minSize: 150,
        maxSize: 180,
        enableGlobalFilter: true,
        cell: ({ getValue, column }) => {
            const value = getValue<string>();
            return (
                <div className="flex items-start gap-2 min-w-0 text-(--brand-title-primary-color)">
                    <HighlightedText text={value} columnId={column.id} highlightGlobal />
                </div>
            );
        },
    },
    {
        id: 'updated_by',
        accessorKey: 'updated_by',
        header: 'Updated By',
        size: 200,
        minSize: 140,
        maxSize: 260,
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
];

export default ITSMConnectorsTable;
