import { useMemo } from 'react';
import { HighlightedText, VirtualTable, type VirtualTableColumnDef, dateSortFn, prioritySortFn } from '@/shared/modules/virtual-table';
import { useIncidentStatsByPriorityAndGroupByState } from '@/modules/major-incident-management/hooks/useIncidentStatsByPriorityAndGroupByState';
import SnowTicketPriorityCell from '@/shared/components/ui/VirtualTableCells/SnowTicketPriorityCell';
import SnowTicketStateCell from '@/shared/components/ui/VirtualTableCells/SnowTicketStateCell';
import SnowTicketDateTimeCell from '@/shared/components/ui/VirtualTableCells/SnowTicketDateTimeCell';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import type { ServiceNowIncident } from '@/modules/major-incident-management/services/incident-stats.service';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import { useNavigate } from '@tanstack/react-router';

interface MajorIncidentsTableProps {
    selectedState: string | null;
    onStateSelect: (state: string | null) => void;
    selectedGroup: string | null;
    onGroupSelect: (group: string | null) => void;
    priorities: number[];
    states: number[];
    groups: string[];
    dateRange?: { start: string; end: string };
}

const dataColumns: VirtualTableColumnDef<ServiceNowIncident>[] = [
    {
        id: 'number',
        accessorFn: (row) => row?.number?.display_value ?? '',
        header: 'Number',
        size: 140,
        minSize: 140,
        maxSize: 180,
        meta: { filterType: 'text', filterPlaceholder: 'Search Number...' },
        cell: ({ getValue, column }) => {
            const value = getValue() as string;
            return (
                <div className="flex items-start gap-2 min-w-0">
                    <span className={twMerge('size-1.5 shrink-0 rounded-full mt-2 bg-(--brand-color)')} />

                    <CopyText text={value} className="flex-1 min-w-0" textClassName="text-[0.65rem] font-semibold text-(--brand-title-primary-color)">
                        {({ text }) => (
                            <span className="text-[0.65rem] font-semibold break-all text-(--brand-title-primary-color) cursor-pointer hover:underline">
                                <HighlightedText text={text} columnId={column.id} highlightGlobal />
                            </span>
                        )}
                    </CopyText>
                </div>
            );
        },
    },
    {
        id: 'short_description',
        accessorFn: (row) => row?.short_description?.display_value ?? '',
        header: 'Short Description',
        size: 250,
        minSize: 200,
        maxSize: 450,
        meta: { filterType: 'text' },
    },
    {
        id: 'priority',
        accessorFn: (row) => row?.priority?.display_value ?? '',
        header: 'Priority',
        size: 130,
        maxSize: 160,
        sortingFn: prioritySortFn,
        cell: (info) => <SnowTicketPriorityCell {...info} prefix="P" />,
        meta: { filterType: 'select' },
    },
    {
        id: 'state',
        accessorFn: (row) => row?.state?.display_value ?? '',
        header: 'State',
        size: 110,
        maxSize: 130,
        meta: { filterType: 'select' },
        cell: SnowTicketStateCell,
    },
    {
        id: 'category',
        accessorFn: (row) => row?.category?.display_value ?? '',
        header: 'Category',
        size: 130,
        maxSize: 150,
        meta: { filterType: 'select' },
    },
    {
        id: 'assignment_group',
        accessorFn: (row) => row?.assignment_group?.display_value ?? '',
        header: 'Assignment Group',
        size: 160,
        maxSize: 250,
        meta: { filterType: 'select' },
    },
    {
        id: 'assigned_to',
        accessorFn: (row) => row?.assigned_to?.display_value ?? '',
        header: 'Assigned To',
        size: 150,
        maxSize: 250,
        meta: { filterType: 'text' },
    },
    {
        id: 'sys_created_on',
        accessorFn: (row) => row?.sys_created_on?.display_value ?? '',
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
    {
        id: 'sys_updated_on',
        accessorFn: (row) => row?.sys_updated_on?.display_value ?? '',
        header: 'Last Updated On',
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
    {
        id: 'problem_id',
        accessorFn: (row) => row?.problem_id?.display_value ?? '',
        header: 'Problem',
        size: 100,
        minSize: 140,
        maxSize: 180,
        enableGlobalFilter: true,
        cell: ({ getValue, column, row: _ }) => {
            const value = getValue() as string;
            if (!value) return;
            return (
                <div className="flex items-start gap-2 min-w-0">
                    <CopyText text={value} className="flex-1 min-w-0" textClassName="text-[0.65rem] font-semibold text-(--brand-title-primary-color)">
                        {({ text }) => (
                            <span className="text-[0.65rem] font-semibold break-all text-(--brand-title-primary-color) cursor-pointer hover:underline">
                                {/* <Link
                                    to="/itops-ai/problem-ai"
                                    search={{
                                        number: row?.original?.problem_id?.display_value,
                                        id: row?.original?.problem_id?.value,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                > */}
                                <HighlightedText text={text} columnId={column.id} highlightGlobal />
                                {/* </Link> */}
                            </span>
                        )}
                    </CopyText>
                </div>
            );
        },
    },
];

const MajorIncidentsTable: React.FC<MajorIncidentsTableProps> = ({ selectedState, onStateSelect, priorities, states, groups, onGroupSelect, selectedGroup, dateRange }) => {
    const { data, isLoading, isError, error, isRefetching, refetch } = useIncidentStatsByPriorityAndGroupByState({ priorities, states, groups, dateRange });

    const navigate = useNavigate();

    const rawIncidents = data?.raw_incidents ?? [];

    const filteredIncidents = useMemo(() => {
        if (!selectedState && !selectedGroup) return rawIncidents;
        return rawIncidents.filter((inc) => {
            const isInState = Boolean(selectedState ? inc.state?.value === selectedState : true);
            const isInGroup = Boolean(selectedGroup ? inc.assignment_group?.value === selectedGroup : true);

            return isInState && isInGroup;
        });
    }, [rawIncidents, selectedState, selectedGroup]);

    const activeStateFilterLabel = useMemo(() => {
        if (!selectedState) return null;
        return data?.state_stats?.find((s) => s.value === selectedState)?.label ?? null;
    }, [data?.state_stats, selectedState]);

    const activeGroupFilterLabel = useMemo(() => {
        if (!selectedGroup) return null;
        return data?.group_stats?.find((g) => g.value === selectedGroup)?.label ?? null;
    }, [data?.group_stats, selectedGroup]);

    return (
        <div className="h-full">
            <VirtualTable
                data={filteredIncidents}
                columns={dataColumns}
                getRowId={(row) => row?.sys_id?.value ?? ''}
                enableSorting
                enableColumnFilters
                enableGlobalFilter
                isLoading={isLoading}
                error={isError ? error : null}
                onRetry={refetch}
                isRetrying={isRefetching}
                retryLabel="Reload"
                emptyTitle="No major incidents found"
                emptyMessage="Try adjusting filters and check !"
                initialFiltersVisible={false}
                onRowClick={(row) => {
                    navigate({
                        to: '/itops-ai/major-incident-management/incident-analysis',
                        search: { inc: btoa(row?.number?.value ?? '') },
                    });
                }}
                initialColumnVisibility={{
                    number: true,
                    short_description: true,
                    priority: true,
                    state: true,
                    problem_id: true,
                    category: true,
                    assignment_group: true,
                    assigned_to: true,
                    sys_created_on: true,
                    sys_updated_on: true,
                }}
                initialSorting={[{ id: 'sys_created_on', desc: true }]}
                initialColumnOrder={[
                    'number',
                    'short_description',
                    'priority',
                    'category',
                    'state',
                    'problem_id',
                    'assignment_group',
                    'assigned_to',
                    'sys_created_on',
                    'sys_updated_on',
                ]}
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
                <VirtualTable.Toolbar className="flex items-center gap-2">
                    <TitleWithArraow className="text-xs uppercase text-(--brand-header-title-color) font-bold p-0 m-0" title="Major Incidents List" />
                    {activeStateFilterLabel ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-bold shadow-sm select-none">
                            <span>Status: {activeStateFilterLabel}</span>
                            <button
                                onClick={() => onStateSelect(null)}
                                className="hover:bg-blue-100 text-blue-500 hover:text-blue-700 rounded-full p-0.5 transition-colors cursor-pointer flex items-center justify-center"
                                title="Clear Filter"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ) : null}
                    {activeGroupFilterLabel ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-bold shadow-sm select-none">
                            <span>Group: {activeGroupFilterLabel}</span>
                            <button
                                onClick={() => onGroupSelect(null)}
                                className="hover:bg-blue-100 text-blue-500 hover:text-blue-700 rounded-full p-0.5 transition-colors cursor-pointer flex items-center justify-center"
                                title="Clear Filter"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ) : null}
                    <VirtualTable.RowInfo rowsAlias=" Incidents" />
                    <div className="flex-1" />
                    <VirtualTable.GlobalSearch placeholder="Search incidents..." />
                    <VirtualTable.ColumnConfig />
                    <RefetchButton isRefetching={isRefetching} onRefetch={refetch} />
                </VirtualTable.Toolbar>
                <VirtualTable.Content className="rounded-sm" />
            </VirtualTable>
        </div>
    );
};

export default MajorIncidentsTable;
