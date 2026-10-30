import type { ColumnDef, RowData } from '@tanstack/react-table';
import type { ActionColumnConfig } from '../types';

export const ACTION_COLUMN_ID = '__actions';

export function createActionColumn<TData extends RowData>(config: ActionColumnConfig<TData>): ColumnDef<TData, unknown> {
    const { actions, columnId = ACTION_COLUMN_ID, header = '', size = 100 } = config;

    return {
        id: columnId,
        header,
        size,
        minSize: size,
        maxSize: size,
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        enableResizing: false,
        meta: { label: header || 'Actions' },
        cell: ({ row }) => {
            return (
                <div className="flex items-center justify-center gap-1">
                    {actions.map((action) => {
                        if (action.hidden?.(row.original)) return null;
                        const isDisabled = action.disabled?.(row.original) ?? false;

                        return (
                            <button
                                key={action.id}
                                type="button"
                                title={action.label}
                                disabled={isDisabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(row.original);
                                }}
                                className={`cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 ${action.className ?? ''}`}
                            >
                                {action.icon ?? <span className="text-[10px]">{action.label}</span>}
                            </button>
                        );
                    })}
                </div>
            );
        },
    };
}
