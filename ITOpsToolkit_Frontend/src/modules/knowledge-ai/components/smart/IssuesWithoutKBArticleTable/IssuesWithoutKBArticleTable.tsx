import { useCallback, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { VirtualTable, type VirtualTableColumnDef, createActionColumn, dateSortFn, prioritySortFn } from '@/shared/modules/virtual-table';
import { useIssuesWithoutKbArticlesQuery } from '../../../hooks/useIssuesWithoutKbArticlesQuery';
import GenerateKBArticleModal from '../../../../../shared/modules/atk-backend/components/smart/GenerateKBArticleModal/GenerateKBArticleModal';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import SnowTicketPriorityCell from '@/shared/components/ui/VirtualTableCells/SnowTicketPriorityCell';
import SnowTicketStateCell from '@/shared/components/ui/VirtualTableCells/SnowTicketStateCell';
import SnowTicketDateTimeCell from '@/shared/components/ui/VirtualTableCells/SnowTicketDateTimeCell';

const dataColumns: VirtualTableColumnDef<IssueWithoutKBArticle>[] = [
    {
        id: 'number',
        accessorKey: 'number',
        header: 'Number',
        size: 130,
        minSize: 110,
        maxSize: 150,
        meta: { filterType: 'text', filterPlaceholder: 'Search Number...' },
    },
    {
        id: 'description',
        accessorKey: 'description',
        header: 'Issue Description',
        minSize: 400,
        meta: { filterType: 'text', filterPlaceholder: 'Search...' },
    },
    {
        id: 'short_description',
        accessorKey: 'short_description',
        header: 'Short Description',
        minSize: 400,
        meta: { filterType: 'text', filterPlaceholder: 'Search...' },
    },
    {
        id: 'priority',
        accessorKey: 'priority',
        header: 'Priority',
        size: 120,
        minSize: 80,
        maxSize: 150,
        sortingFn: prioritySortFn,
        meta: {
            filterType: 'select',
            filterOptions: [
                { label: '1 - Critical', value: '1 - Critical' },
                { label: '2 - High', value: '2 - High' },
                { label: '3 - Moderate', value: '3 - Moderate' },
                { label: '4 - Low', value: '4 - Low' },
            ],
        },
        cell: SnowTicketPriorityCell,
    },
    {
        id: 'state',
        accessorKey: 'state',
        header: 'Status',
        size: 120,
        maxSize: 120,
        meta: { filterType: 'select' },
        cell: SnowTicketStateCell,
    },
    {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        size: 130,
        maxSize: 150,

        meta: { filterType: 'select' },
    },
    {
        id: 'assignment_group',
        accessorKey: 'assignment_group',
        header: 'Assignment Group',
        size: 160,
        maxSize: 250,
        meta: { filterType: 'select' },
    },
    {
        id: 'assigned_to',
        accessorKey: 'assigned_to',
        header: 'Assigned To',
        size: 150,
        maxSize: 250,
        meta: { filterType: 'text' },
    },
    {
        id: 'caller_id',
        accessorKey: 'caller_id',
        header: 'Caller',
        size: 140,
        maxSize: 200,
        meta: { filterType: 'text' },
    },
    {
        id: 'cmdb_ci',
        accessorKey: 'cmdb_ci',
        header: 'CI',
        size: 140,
        maxSize: 200,
    },
    {
        id: 'location',
        accessorKey: 'location',
        header: 'Location',
        size: 140,
        maxSize: 150,
    },
    {
        id: 'comments',
        accessorKey: 'comments',
        header: 'Comments',
        minSize: 200,
        meta: { filterType: 'text', filterPlaceholder: 'Search...' },
    },
    {
        id: 'work_notes',
        accessorKey: 'work_notes',
        header: 'Work Notes',
        minSize: 200,
        meta: { filterType: 'text', filterPlaceholder: 'Search...' },
    },
    {
        id: 'close_notes',
        accessorKey: 'close_notes',
        header: 'Close Notes',
        minSize: 200,
        meta: { filterType: 'text', filterPlaceholder: 'Search...' },
    },
    {
        id: 'sys_created_by',
        accessorKey: 'sys_created_by',
        header: 'Created By',
        size: 150,
        maxSize: 200,

        meta: { filterType: 'text', filterPlaceholder: 'Search...' },
    },
    {
        id: 'sys_created_on',
        accessorKey: 'sys_created_on',
        header: 'Date Reported On',
        size: 120,
        minSize: 140,
        maxSize: 180,
        sortingFn: dateSortFn,
        enableGlobalFilter: false,
        cell: SnowTicketDateTimeCell,
        meta: {
            filterType: 'date-range',
        },
    },
];

const IssuesWithoutKBArticleTable: React.FC = () => {
    const { data, isLoading, isError, error, isRefetching, refetch } = useIssuesWithoutKbArticlesQuery();

    const [selectedIssueForKbCreation, setSelectedIssueForKBCreation] = useState<IssueWithoutKBArticle | null>(null);

    const handleRowClick = useCallback((row: IssueWithoutKBArticle) => {
        setSelectedIssueForKBCreation(row);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedIssueForKBCreation(null);
    }, []);

    const columns = useMemo<VirtualTableColumnDef<IssueWithoutKBArticle>[]>(
        () => [
            ...dataColumns,
            createActionColumn<IssueWithoutKBArticle>({
                columnId: 'link',
                actions: [
                    {
                        id: 'open',
                        label: 'Open in ServiceNow',
                        icon: <ExternalLink size={14} />,
                        onClick: (row) => {
                            if (row.ticket_link) window.open(row.ticket_link, '_blank');
                        },
                        hidden: (row) => !row.ticket_link,
                    },
                ],
                header: 'Link',
                size: 80,
            }) as VirtualTableColumnDef<IssueWithoutKBArticle>,
        ],
        [],
    );

    return (
        <>
            <div className="h-full">
                <VirtualTable
                    data={data ?? []}
                    columns={columns}
                    getRowId={(row) => row.sys_id}
                    onRowClick={handleRowClick}
                    enableSorting
                    enableColumnFilters
                    enableGlobalFilter
                    isLoading={isLoading}
                    error={isError ? error : null}
                    onRetry={refetch}
                    isRetrying={isRefetching}
                    retryLabel="Reload"
                    emptyTitle="No issues found"
                    emptyMessage="Try adjusting filters and check !"
                    initialFiltersVisible={false}
                    initialColumnVisibility={{
                        number: true,
                        description: true,
                        short_description: false,
                        priority: true,
                        state: true,
                        category: true,
                        assignment_group: false,
                        assigned_to: true,
                        caller_id: false,
                        cmdb_ci: false,
                        location: false,
                        comments: false,
                        work_notes: false,
                        close_notes: false,
                        sys_created_by: false,
                        sys_created_on: true,
                        link: false,
                    }}
                    initialColumnOrder={['number', 'description', 'priority', 'category', 'state', 'sys_created_on', 'assigned_to']}
                    classNames={{
                        tbodyCell: 'text-[0.65rem] 2xl:text-xs py-1',
                        theadCell: 'text-xs 2xl:text-sm font-semibold py-1 bg-(--brand-color) text-(--brand-text-inverse)',
                        filterCell: 'text-[0.7rem]',
                        toolbar: 'pb-2 pt-1 px-1.5',
                        theadRow: 'bg-(--brand-color)',
                        thead: 'bg-(--brand-color)',
                        sortIcon: 'text-(--brand-text-inverse) text-xs',
                    }}
                >
                    <VirtualTable.Toolbar className="">
                        <TitleWithArraow
                            className="text-xs uppercase text-(--brand-header-title-color) font-bold p-0 m-0"
                            title="Most Common Issues Reported Without Knowledge Base"
                        />
                        <div className="flex-1" />
                        <VirtualTable.GlobalSearch placeholder="Search issues..." />
                        <VirtualTable.ColumnConfig />
                        <RefetchButton isRefetching={isRefetching} onRefetch={refetch} />
                    </VirtualTable.Toolbar>
                    <VirtualTable.Content className="rounded-sm" />
                </VirtualTable>
            </div>
            <GenerateKBArticleModal issue={selectedIssueForKbCreation} onClose={handleModalClose} />
        </>
    );
};

export default IssuesWithoutKBArticleTable;
