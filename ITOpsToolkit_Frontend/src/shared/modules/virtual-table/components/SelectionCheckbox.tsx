import type { ColumnDef, RowData, HeaderContext, CellContext } from '@tanstack/react-table';

//  Selection Column ID
export const SELECTION_COLUMN_ID = '__selection';

//  Checkbox Components (inline - no need for separate files)

function HeaderCheckbox<TData extends RowData>({ table }: HeaderContext<TData, unknown>) {
    const checked = table.getIsAllPageRowsSelected();
    const indeterminate = table.getIsSomePageRowsSelected();

    return (
        <input
            type="checkbox"
            checked={checked}
            ref={(el) => {
                if (el) el.indeterminate = indeterminate && !checked;
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 accent-blue-600"
            aria-label="Select all rows"
        />
    );
}

function RowCheckbox<TData extends RowData>({ row }: CellContext<TData, unknown>) {
    return (
        <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 accent-blue-600"
            aria-label="Select row"
        />
    );
}

//  Column Definition Factory

export function SelectionCheckboxColumn<TData extends RowData>(): ColumnDef<TData, unknown> {
    return {
        id: SELECTION_COLUMN_ID,
        header: HeaderCheckbox,
        cell: RowCheckbox,
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        enableResizing: false,
        meta: { label: 'Selection' },
    };
}
