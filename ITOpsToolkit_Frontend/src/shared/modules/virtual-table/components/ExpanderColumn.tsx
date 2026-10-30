import type { ColumnDef, RowData } from '@tanstack/react-table';
import { ChevronRight } from 'lucide-react';

export const EXPANDER_COLUMN_ID = '__expander';

export function ExpanderColumn<TData extends RowData>(): ColumnDef<TData, unknown> {
    return {
        id: EXPANDER_COLUMN_ID,
        header: () => null,
        size: 46,
        minSize: 46,
        maxSize: 46,
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        enableResizing: false,
        enableHiding: false,
        meta: { label: 'Expand' },
        cell: ({ row }) => {
            if (!row.getCanExpand()) return null;
            return (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        row.toggleExpanded();
                    }}
                    className="flex cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
                >
                    <ChevronRight size={16} className={`transition-transform duration-200 ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
                </button>
            );
        },
    };
}
