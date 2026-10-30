import { useCallback, useMemo } from 'react';
import { VirtualTable, type VirtualTableColumnDef, dateSortFn } from '@/shared/modules/virtual-table';
import type { AssociatedIncident } from '../../../types/problem-ai';

interface AssociatedIncidentsTableProps {
    incidents: AssociatedIncident[];
    onSelectionChange: (selected: AssociatedIncident[]) => void;
}

const columns: VirtualTableColumnDef<AssociatedIncident>[] = [
    {
        accessorKey: 'number',
        header: 'Incident ID',
        size: 140,
        minSize: 120,
        maxSize: 180,
    },
    {
        accessorKey: 'short_description',
        header: 'Short Description',
        minSize: 260,
    },
    {
        accessorKey: 'state',
        header: 'State',
        size: 130,
        minSize: 110,
        maxSize: 160,
    },
    {
        accessorKey: 'urgency',
        header: 'Urgency',
        size: 110,
        minSize: 100,
        maxSize: 140,
    },
    {
        accessorKey: 'impact',
        header: 'Impact',
        size: 110,
        minSize: 100,
        maxSize: 140,
    },
    {
        accessorKey: 'assigned_to',
        header: 'Assigned To',
        size: 150,
        minSize: 120,
        maxSize: 220,
    },
    {
        accessorKey: 'assignment_group',
        header: 'Assignment Group',
        size: 160,
        minSize: 130,
        maxSize: 240,
    },
    {
        accessorKey: 'opened_by',
        header: 'Opened By',
        size: 150,
        minSize: 120,
        maxSize: 220,
    },
    {
        accessorKey: 'sys_created_on',
        header: 'Created On',
        size: 170,
        minSize: 140,
        maxSize: 200,
        sortingFn: dateSortFn,
    },
];

const AssociatedIncidentsTable: React.FC<AssociatedIncidentsTableProps> = ({ incidents, onSelectionChange }) => {
    const handleSelectionChange = useCallback((rows: AssociatedIncident[]) => onSelectionChange(rows), [onSelectionChange]);

    const rows = useMemo(() => incidents ?? [], [incidents]);
    return (
        <div className="h-60 2xl:h-72">
            <VirtualTable<AssociatedIncident>
                data={rows}
                columns={columns}
                getRowId={(row) => row.number}
                enableRowSelection
                enableMultiRowSelection
                selectionColumnPinned="left"
                onRowSelectionChange={handleSelectionChange}
                enableSorting
                enableGlobalFilter
                onRowClick={(_1, _2, row) => row.toggleSelected()}
                emptyTitle="No related incidents"
                emptyMessage="No incident records found for this problem."
                estimateRowHeight={36}
                initialColumnVisibility={{
                    number: true,
                    short_description: true,
                    state: true,
                    urgency: false,
                    impact: false,
                    assigned_to: true,
                    assignment_group: false,
                    opened_by: false,
                    sys_created_on: true,
                }}
                initialColumnOrder={['number', 'short_description', 'state', 'urgency', 'impact', 'assigned_to', 'assignment_group', 'opened_by', 'sys_created_on']}
                classNames={{
                    tbodyCell: 'text-[0.7rem] 2xl:text-xs py-1 2xl:py-1.5',
                    theadCell: 'text-xs 2xl:text-sm font-semibold py-1.5 2xl:py-2 bg-(--brand-color) text-(--brand-text-inverse)',
                    theadRow: 'bg-(--brand-color)',
                    thead: 'bg-(--brand-color)',
                    sortIcon: 'text-(--brand-text-inverse) text-xs 2xl:text-sm',
                    toolbar: 'px-1.5 2xl:px-2 py-1 2xl:py-1.5',
                }}
            >
                <VirtualTable.Toolbar>
                    <VirtualTable.GlobalSearch placeholder="Search incidents..." />
                    <VirtualTable.RowInfo />
                    <div className="flex-1" />
                    <VirtualTable.ColumnConfig />
                </VirtualTable.Toolbar>
                <VirtualTable.Content className="rounded-sm" />
            </VirtualTable>
        </div>
    );
};

export default AssociatedIncidentsTable;
