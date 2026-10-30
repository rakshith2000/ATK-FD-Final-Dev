import { type FC, type ReactElement, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { flexRender, type Cell, type RowData, type Row, type Column, type ColumnPinningState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { twMerge } from 'tailwind-merge';
import { TableSkeleton } from '@/shared/components/ui/Skeletons';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { useVirtualTableContext } from '../VirtualTableContext';
import HeaderCell from './HeaderCell';
import HighlightedText from './HighlightedText';
import EditableCell from './EditableCell';
import ColumnFilter from './filters/ColumnFilter';
import type { ContentProps, ColumnMeta } from '../types';

// Wrapper component that creates a React component boundary for
// renderSubComponent. Without this, calling renderSubComponent({ row })
// directly inside Content's render executes the sub-component's hooks
// (e.g. useState) as part of Content, violating the Rules of Hooks
// when the number of expanded rows changes.
function SubComponentRenderer<TData extends RowData>({ render, row }: { render: (props: { row: Row<TData> }) => ReactElement; row: Row<TData> }) {
    return render({ row });
}

const PINNED_HEADER_Z = 30;
const PINNED_BODY_Z = 20;

//  Pin-aware ordering helpers
// getHeaderGroups() reorders columns to [left-pinned, center, right-pinned]
// using the columnPinning.left / .right array order. Filter row and body
// rows must replicate that exact order so table cells align under
// tableLayout: fixed.

function getPinOrderedColumns<T extends RowData>(allVisible: Column<T, unknown>[], pinning: ColumnPinningState) {
    const leftIds = pinning.left ?? [];
    const rightIds = pinning.right ?? [];
    const pinnedSet = new Set([...leftIds, ...rightIds]);

    const left = leftIds.map((id) => allVisible.find((c) => c.id === id)).filter(Boolean) as Column<T, unknown>[];
    const right = rightIds.map((id) => allVisible.find((c) => c.id === id)).filter(Boolean) as Column<T, unknown>[];
    const center = allVisible.filter((c) => !pinnedSet.has(c.id));
    return [...left, ...center, ...right];
}

function getPinOrderedCells<T extends RowData>(row: Row<T>, pinning: ColumnPinningState) {
    const all = row.getVisibleCells();
    const leftIds = pinning.left ?? [];
    const rightIds = pinning.right ?? [];
    const pinnedSet = new Set([...leftIds, ...rightIds]);

    const left = leftIds.map((id) => all.find((c) => c.column.id === id)).filter(Boolean) as Cell<T, unknown>[];
    const right = rightIds.map((id) => all.find((c) => c.column.id === id)).filter(Boolean) as Cell<T, unknown>[];
    const center = all.filter((c) => !pinnedSet.has(c.column.id));
    return [...left, ...center, ...right];
}

const Content: FC<ContentProps> = ({ className }) => {
    const {
        table,
        classNames,
        containerHeight,
        isLoading,
        error,
        errorTitle,
        onRetry,
        isRetrying,
        retryLabel,
        emptyTitle,
        emptyMessage,
        emptyIcon,
        filtersVisible,
        globalFilter,
        columnFilters,
        customCellColumnIds,
        estimateRowHeight,
        overscan,
        columnPinning,
        onRowClick,
        renderSubComponent,
        editingRowIds,
        scrollToTopCounter,
    } = useVirtualTableContext();

    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to top after React commits new data to the DOM.
    // useLayoutEffect fires synchronously after DOM mutation but before paint,
    // so the virtualizer sees scrollTop=0 and renders the correct rows in the
    // same frame - no flash of stale content.
    const isFirstRender = useRef(true);
    useLayoutEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        scrollRef.current?.scrollTo({ top: 0 });
    }, [scrollToTopCounter]);

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: useCallback(() => scrollRef.current, []),
        estimateSize: useCallback(() => estimateRowHeight, [estimateRowHeight]),
        overscan,
    });

    const headerGroups = table.getHeaderGroups();

    // Pin-aware column order - must match headerGroups order.
    // Re-computed when pinning state changes.
    const visibleColumns = table.getVisibleLeafColumns();
    const orderedColumns = useMemo(() => getPinOrderedColumns(visibleColumns, columnPinning), [visibleColumns, columnPinning]);

    // Edge-most pinned column IDs - only these get the separator border + shadow
    const lastLeftPinnedId = columnPinning.left?.length ? columnPinning.left[columnPinning.left.length - 1] : null;
    const firstRightPinnedId = columnPinning.right?.length ? columnPinning.right[0] : null;

    const hasFilters =
        filtersVisible &&
        table.getAllLeafColumns().some((col) => {
            const meta = col.columnDef.meta as ColumnMeta | undefined;
            return meta?.filterType && col.getCanFilter();
        });

    const totalHeight = rowVirtualizer.getTotalSize();
    const virtualRows = rowVirtualizer.getVirtualItems();
    const colSpan = table.getVisibleLeafColumns().length;

    const showDataRows = !isLoading && !error && rows.length > 0;

    //  Determine which state placeholder to render
    // Rendered as a sticky overlay *outside* the <table> so it stays
    // viewport-centered even when the user scrolls horizontally.
    const statePlaceholder = isLoading ? (
        <TableSkeleton
            rows={20}
            VW={600}
            cols={table.getVisibleLeafColumns().length}
            className={twMerge('w-full p-3', classNames.loadingState as string)}
            COL_GAP={2}
            GAP={2}
            HEADER_H={8}
            ROW_H={20}
        />
    ) : error ? (
        <ErrorPlaceholder
            title={errorTitle}
            error={error}
            onRetry={onRetry}
            iconSize={100}
            isRefetching={isRetrying}
            retryLabel={retryLabel}
            className={classNames.emptyState as string}
        />
    ) : rows.length === 0 ? (
        <EmptyPlaceholder
            message={`${emptyTitle} - ${emptyMessage}`}
            icon={emptyIcon}
            iconSize={120}
            isRefetching={isRetrying}
            retryLabel={retryLabel ?? 'Refresh'}
            className={classNames.emptyState as string}
        />
    ) : null;

    //  Render cell with search highlight
    // TanStack merges a default cell renderer onto every column, so
    // flexRender always returns a React element (never a raw string).
    // We check the ORIGINAL column defs (via customCellColumnIds) to
    // know which columns had user-defined cell renderers. For default
    // cells we render the raw getValue() wrapped in HighlightedText;
    // for custom cells we use flexRender untouched.
    //
    // HighlightedText now supports both global search AND column-level
    // text/search filter highlighting via the columnId prop.
    const columnFilterIds = useMemo(() => new Set(columnFilters.filter((f) => typeof f.value === 'string' && f.value).map((f) => f.id)), [columnFilters]);

    const renderCellContent = (cell: Cell<RowData, unknown>) => {
        const value = cell.getValue();
        const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
        const isCustomCell = customCellColumnIds.has(cell.column.id);

        //  Editable cell check
        const isRowEditing = editingRowIds[cell.row.id] ?? false;
        if (isRowEditing && meta?.canEdit) {
            const canEdit = typeof meta.canEdit === 'function' ? meta.canEdit(cell.row) : meta.canEdit;
            if (canEdit) {
                return <EditableCell cell={cell} className={classNames.editInput as string} errorClassName={classNames.editInputError as string} />;
            }
        }

        // Empty placeholder for cells with no data (skip custom-rendered cells)
        if (!isCustomCell && (value === null || value === undefined || value === '')) {
            return <span className="text-gray-300">-</span>;
        }

        const hasColumnHighlight = columnFilterIds.has(cell.column.id);
        const canGlobalFilter = cell.column.getCanGlobalFilter();
        const hasGlobalHighlight = globalFilter && canGlobalFilter;
        const needsHighlight = (hasGlobalHighlight || hasColumnHighlight) && !isCustomCell;

        if (needsHighlight) {
            if (typeof value === 'string' || typeof value === 'number') {
                return <HighlightedText text={String(value)} columnId={cell.column.id} highlightGlobal={canGlobalFilter} />;
            }
        }
        return flexRender(cell.column.columnDef.cell, cell.getContext());
    };

    return (
        <div
            ref={scrollRef}
            className={twMerge('relative flex-1 overflow-auto', classNames.tableWrapper, className)}
            style={{ maxHeight: containerHeight > 0 ? containerHeight : undefined }}
        >
            <table className={twMerge('w-full border-separate border-spacing-0', classNames.table)} style={{ tableLayout: 'fixed' }}>
                <thead className={twMerge('sticky top-0 z-30', classNames.thead)}>
                    {headerGroups.map((headerGroup) => (
                        <tr key={headerGroup.id} className={twMerge('', classNames.theadRow)}>
                            {headerGroup.headers.map((header) => (
                                <HeaderCell key={header.id} header={header} />
                            ))}
                        </tr>
                    ))}

                    {hasFilters && (
                        <tr className={twMerge('bg-white', classNames.filterRow)}>
                            {orderedColumns.map((column) => {
                                const isPinnedLeft = column.getIsPinned() === 'left';
                                const isPinnedRight = column.getIsPinned() === 'right';
                                const isPinned = isPinnedLeft || isPinnedRight;
                                const isLastLeft = column.id === lastLeftPinnedId;
                                const isFirstRight = column.id === firstRightPinnedId;
                                return (
                                    <td
                                        key={column.id}
                                        style={{
                                            width: column.getSize(),
                                            position: isPinned ? 'sticky' : 'relative',
                                            left: isPinnedLeft ? `${column.getStart('left')}px` : undefined,
                                            right: isPinnedRight ? `${column.getAfter('right')}px` : undefined,
                                            zIndex: isPinned ? PINNED_HEADER_Z : undefined,
                                        }}
                                        className={twMerge(
                                            'border-b border-r border-gray-200 bg-white px-2 py-1',
                                            isPinned && 'bg-gray-50',
                                            isLastLeft && 'border-r border-r-blue-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                                            isFirstRight && 'border-l border-l-blue-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                                            classNames.filterCell,
                                        )}
                                    >
                                        <ColumnFilter column={column} />
                                    </td>
                                );
                            })}
                        </tr>
                    )}
                </thead>

                {/*  Top spacer  */}
                {showDataRows && virtualRows.length > 0 && virtualRows[0].start > 0 && (
                    <tbody>
                        <tr>
                            <td colSpan={colSpan} style={{ height: virtualRows[0].start }} />
                        </tr>
                    </tbody>
                )}

                {/*  Virtual rows - each in its own <tbody> for accurate
                     measurement when sub-components are expanded  */}
                {showDataRows &&
                    virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        const isEvenRow = virtualRow.index % 2 === 0;
                        const rowBg = isEvenRow ? 'bg-white' : 'bg-gray-50/50';
                        const isExpanded = row.getIsExpanded();
                        const isRowEditing = editingRowIds[row.id] ?? false;

                        const handleRowClick = (e: React.MouseEvent) => {
                            onRowClick?.(row.original, e, row);
                        };

                        return (
                            <tbody key={row.id} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className={classNames.tbody as string}>
                                <tr
                                    onClick={handleRowClick}
                                    className={twMerge(
                                        'transition-colors hover:bg-blue-50/40',
                                        onRowClick && 'cursor-pointer',
                                        rowBg,
                                        row.getIsSelected() && 'bg-blue-100',
                                        isRowEditing && 'ring-1 ring-inset ring-blue-200 bg-blue-50/30',
                                        isRowEditing && classNames.editingRow,
                                        classNames.tbodyRow,
                                    )}
                                >
                                    {getPinOrderedCells(row, columnPinning).map((cell) => {
                                        const isPinnedLeft = cell.column.getIsPinned() === 'left';
                                        const isPinnedRight = cell.column.getIsPinned() === 'right';
                                        const isPinned = isPinnedLeft || isPinnedRight;
                                        const pinnedBg = isEvenRow ? 'bg-white' : 'bg-gray-50';
                                        const isLastLeft = cell.column.id === lastLeftPinnedId;
                                        const isFirstRight = cell.column.id === firstRightPinnedId;

                                        return (
                                            <td
                                                key={cell.id}
                                                style={{
                                                    width: cell.column.getSize(),
                                                    minWidth: cell.column.columnDef.minSize ?? 60,
                                                    maxWidth: cell.column.columnDef.maxSize,
                                                    position: isPinned ? 'sticky' : undefined,
                                                    left: isPinnedLeft ? `${cell.column.getStart('left')}px` : undefined,
                                                    right: isPinnedRight ? `${cell.column.getAfter('right')}px` : undefined,
                                                    zIndex: isPinned ? PINNED_BODY_Z : undefined,
                                                }}
                                                className={twMerge(
                                                    'border-b border-r border-gray-100 px-3 py-2 text-xs text-gray-700',
                                                    isPinned && pinnedBg,
                                                    isLastLeft && `border-r border-r-blue-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]`,
                                                    isFirstRight && `border-l border-l-blue-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]`,
                                                    classNames.tbodyCell,
                                                )}
                                            >
                                                <div className="min-w-0 line-clamp-2 wrap-break-word">{renderCellContent(cell)}</div>{' '}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/*  Expanded sub-component row  */}
                                {isExpanded && renderSubComponent && (
                                    <tr className={twMerge('bg-gray-50/30', classNames.expandedSubRow)}>
                                        <td colSpan={colSpan} className="p-0">
                                            <SubComponentRenderer render={renderSubComponent} row={row} />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        );
                    })}

                {/*  Bottom spacer  */}
                {showDataRows && virtualRows.length > 0 && totalHeight - virtualRows[virtualRows.length - 1].end > 0 && (
                    <tbody>
                        <tr>
                            <td colSpan={colSpan} style={{ height: totalHeight - virtualRows[virtualRows.length - 1].end }} />
                        </tr>
                    </tbody>
                )}

                {/* Empty tbody when no data rows */}
                {!showDataRows && <tbody className={classNames.tbody as string} />}
            </table>

            {/* State placeholders rendered as a sticky overlay so they stay
                centered in the viewport even when the table scrolls horizontally */}
            {statePlaceholder && (
                <div className="sticky left-0 flex items-start justify-center" style={{ minHeight: '200px' }}>
                    {statePlaceholder}
                </div>
            )}
        </div>
    );
};

Content.displayName = 'VirtualTable.Content';
export default Content;
