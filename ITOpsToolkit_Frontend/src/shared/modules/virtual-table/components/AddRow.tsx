import type { FC } from 'react';
import { Plus } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { AddRowProps } from '../types';

const AddRow: FC<AddRowProps> = ({ label, icon, onClick, className }) => {
    const { onAddRow, addRowLabel, setEditingRowIds, scrollToTop } = useVirtualTableContext();

    // Hide button when neither onAddRow nor a custom onClick is provided
    if (!onAddRow && !onClick) return null;

    const handleClick = () => {
        // Custom onClick fully overrides - skip onAddRow, auto-edit, and scroll
        if (onClick) {
            onClick();
            return;
        }
        const newRowId = onAddRow?.();
        // Auto-enter edit mode for the new row if onAddRow returned an id
        if (newRowId) {
            setEditingRowIds((prev) => ({ ...prev, [newRowId]: true }));
        }
        // Scroll to top so the new row is visible
        scrollToTop();
    };

    const displayLabel = label ?? addRowLabel ?? 'Add Row';

    return (
        <button
            type="button"
            onClick={handleClick}
            className={twMerge(
                'inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                className,
            )}
        >
            {icon ?? <Plus size={14} />}
            {displayLabel}
        </button>
    );
};

AddRow.displayName = 'VirtualTable.AddRow';
export default AddRow;
