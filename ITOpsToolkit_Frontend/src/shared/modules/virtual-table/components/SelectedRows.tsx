import { type ReactNode, useMemo } from 'react';
import type { RowData } from '@tanstack/react-table';
import { useVirtualTableContext } from '../VirtualTableContext';

//  Hook: useSelectedRows
// Gives external components access to the currently selected rows data.
// Must be used inside a <VirtualTable> provider.
export function useSelectedRows<TData extends RowData>(): {
    selectedRows: TData[];
    selectedCount: number;
    clearSelection: () => void;
} {
    const { table, rowSelection } = useVirtualTableContext<TData>();

    const selectedRows = useMemo(() => {
        return Object.keys(rowSelection)
            .filter((key) => rowSelection[key])
            .map((key) => {
                try {
                    return table.getRow(key).original;
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as TData[];
    }, [rowSelection, table]);

    const clearSelection = () => {
        table.resetRowSelection();
    };

    return { selectedRows, selectedCount: selectedRows.length, clearSelection };
}

//  Compound Component: SelectedRows
// Render-prop component that exposes selected rows data to its children.
// Usage:
//   <VirtualTable.SelectedRows>
//     {({ selectedRows, selectedCount, clearSelection }) => (
//       <button onClick={() => handleBulkDelete(selectedRows)}>
//         Delete {selectedCount} items
//       </button>
//     )}
//   </VirtualTable.SelectedRows>
interface SelectedRowsProps<TData extends RowData> {
    children: (ctx: { selectedRows: TData[]; selectedCount: number; clearSelection: () => void }) => ReactNode;
}

function SelectedRows<TData extends RowData>({ children }: SelectedRowsProps<TData>) {
    const ctx = useSelectedRows<TData>();
    return <>{children(ctx)}</>;
}

SelectedRows.displayName = 'VirtualTable.SelectedRows';
export default SelectedRows;
