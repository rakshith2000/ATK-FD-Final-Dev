import { useEffect } from 'react';
import type { ColumnSizingState, Table, RowData } from '@tanstack/react-table';

const SCROLLBAR_WIDTH = 16;
const PIN_INDICATOR_WIDTH = 4;

export function useAutoColumnSizing<TData extends RowData>(
    table: Table<TData>,
    containerWidth: number,
    visibleColumnKey: string,
    setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>,
): void {
    useEffect(() => {
        if (containerWidth <= 0) return;

        const visibleColumns = table.getVisibleLeafColumns();
        if (visibleColumns.length === 0) return;

        const pinnedLeftCount = table.getLeftLeafColumns().length;
        const pinnedRightCount = table.getRightLeafColumns().length;
        const hasPinned = pinnedLeftCount > 0 || pinnedRightCount > 0;

        const availableWidth = containerWidth - SCROLLBAR_WIDTH - (hasPinned ? PIN_INDICATOR_WIDTH * 2 : 0);

        let totalMinWidth = 0;
        let totalDefinedWidth = 0;
        let flexColumnCount = 0;

        const columnMeta = visibleColumns.map((col) => {
            const minSize = col.columnDef.minSize ?? 80;
            const maxSize = col.columnDef.maxSize ?? Infinity;
            const definedSize = col.columnDef.size;

            totalMinWidth += minSize;

            if (definedSize) {
                totalDefinedWidth += definedSize;
            } else {
                flexColumnCount++;
            }

            return { id: col.id, minSize, maxSize, definedSize };
        });

        const remainingWidth = Math.max(0, availableWidth - totalDefinedWidth);
        const flexWidth = flexColumnCount > 0 ? Math.max(80, remainingWidth / flexColumnCount) : 0;

        const needsExpansion = totalMinWidth < availableWidth && totalDefinedWidth < availableWidth && flexColumnCount === 0;
        const expansionRatio = needsExpansion ? availableWidth / totalMinWidth : 1;

        const newSizing: ColumnSizingState = {};

        for (const meta of columnMeta) {
            let width: number;

            if (meta.definedSize) {
                width = needsExpansion ? meta.definedSize * expansionRatio : meta.definedSize;
            } else {
                width = needsExpansion ? meta.minSize * expansionRatio : flexWidth;
            }

            width = Math.max(meta.minSize, Math.min(meta.maxSize, Math.round(width)));
            newSizing[meta.id] = width;
        }

        setColumnSizing(newSizing);
    }, [containerWidth, visibleColumnKey]);
}
