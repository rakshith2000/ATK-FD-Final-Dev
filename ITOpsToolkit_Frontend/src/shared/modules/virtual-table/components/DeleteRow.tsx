import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { DeleteRowProps } from '../types';

const DeleteRow: FC<DeleteRowProps> = ({ label, icon, onClick, className }) => {
    const { onDeleteRow, deleteRowLabel, table } = useVirtualTableContext();

    // Hide button when neither onDeleteRow nor a custom onClick is provided
    if (!onDeleteRow && !onClick) return null;

    const selectedRowIds = Object.keys(table.getState().rowSelection).filter((key) => table.getState().rowSelection[key]);
    const selectedCount = selectedRowIds.length;

    const handleClick = () => {
        // Custom onClick fully overrides - skip onDeleteRow and default behavior
        if (onClick) {
            onClick();
            return;
        }
        if (selectedCount === 0) return;
        for (const rowId of selectedRowIds) {
            table.options.meta?.deleteRow?.(rowId);
        }
        table.resetRowSelection();
    };

    const displayLabel = label ?? deleteRowLabel ?? 'Delete';

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={!onClick && selectedCount === 0}
            className={twMerge(
                'inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
        >
            {icon ?? <Trash2 size={14} />}
            {selectedCount > 0 ? `${displayLabel} (${selectedCount})` : displayLabel}
        </button>
    );
};

DeleteRow.displayName = 'VirtualTable.DeleteRow';
export default DeleteRow;
