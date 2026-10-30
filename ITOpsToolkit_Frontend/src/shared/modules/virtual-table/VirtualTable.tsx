import { useRef, useMemo, useState, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getExpandedRowModel,
    type SortingState,
    type ColumnFiltersState,
    type ColumnSizingState,
    type VisibilityState,
    type ColumnOrderState,
    type ColumnPinningState,
    type RowSelectionState,
    type ExpandedState,
    type RowData,
} from '@tanstack/react-table';
import { twMerge } from 'tailwind-merge';
import VirtualTableContext from './VirtualTableContext';
import { useContainerDimensions } from './hooks/useContainerDimensions';
import { useAutoColumnSizing } from './hooks/useAutoColumnSizing';
import { filterFnMap } from './utils/filter-fns';
import Toolbar from './components/Toolbar';
import Content from './components/Content';
import GlobalSearch from './components/GlobalSearch';
import ColumnConfigPanel from './components/ColumnConfigPanel';
import FilterConfig from './components/FilterConfig';
import SortConfig from './components/SortConfig';
import RowInfo from './components/RowInfo';
import SelectedRows from './components/SelectedRows';
import AddRow from './components/AddRow';
import DeleteRow from './components/DeleteRow';
import ExportData from './components/ExportData';
import { SelectionCheckboxColumn, SELECTION_COLUMN_ID } from './components/SelectionCheckbox';
import { ExpanderColumn, EXPANDER_COLUMN_ID } from './components/ExpanderColumn';
import type { VirtualTableProps, VirtualTableColumnDef, VirtualTableContextValue, ColumnMeta } from './types';

//  Compound Component Composition

interface VirtualTableComposition {
    Toolbar: typeof Toolbar;
    Content: typeof Content;
    GlobalSearch: typeof GlobalSearch;
    ColumnConfig: typeof ColumnConfigPanel;
    FilterConfig: typeof FilterConfig;
    SortConfig: typeof SortConfig;
    RowInfo: typeof RowInfo;
    SelectedRows: typeof SelectedRows;
    AddRow: typeof AddRow;
    DeleteRow: typeof DeleteRow;
    ExportData: typeof ExportData;
}

//  Main Component

function VirtualTableInner<TData extends RowData>({
    data,
    columns,
    classNames = {},
    estimateRowHeight = 52,
    overscan = 10,
    enableColumnResizing = true,
    enableSorting = true,
    enableColumnFilters = true,
    enableGlobalFilter = true,
    enableColumnPinning = true,
    enableColumnVisibility = true,
    maxPinnedColumns = 3,
    enableRowSelection = false,
    enableMultiRowSelection = true,
    onRowSelectionChange,
    selectionColumnPinned,
    onRowClick,
    getRowId,
    isLoading = false,
    loadingMessage,
    error = null,
    errorTitle,
    onRetry,
    isRetrying = false,
    retryLabel = 'Retry',
    emptyTitle = 'No results',
    emptyMessage = 'No data available',
    emptyIcon,
    initialSorting = [],
    initialColumnFilters = [],
    initialColumnVisibility = {},
    initialColumnOrder = [],
    initialColumnPinning = { left: [], right: [] },
    initialFiltersVisible = true,
    renderSubComponent,
    getRowCanExpand,
    updateData,
    onAddRow,
    addRowLabel,
    onDeleteRow,
    deleteRowLabel,
    manualSorting,
    manualFiltering,
    onSortingChange: externalOnSortingChange,
    onFilteringChange: externalOnFilteringChange,
    onGlobalFilterChange: externalOnGlobalFilterChange,
    children,
}: VirtualTableProps<TData>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width: containerWidth, height: containerHeight } = useContainerDimensions(containerRef);

    //  Local State
    const [sorting, setSorting] = useState<SortingState>(initialSorting);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(initialColumnOrder);
    // Merge selectionColumnPinned into the initial pinning state.
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() => {
        const merged: ColumnPinningState = {
            left: [...(initialColumnPinning.left ?? [])],
            right: [...(initialColumnPinning.right ?? [])],
        };
        // Auto-pin selection column
        if (enableRowSelection && selectionColumnPinned && !merged[selectionColumnPinned]?.includes(SELECTION_COLUMN_ID)) {
            if (selectionColumnPinned === 'left') {
                merged.left!.unshift(SELECTION_COLUMN_ID);
            } else {
                merged.right!.push(SELECTION_COLUMN_ID);
            }
        }
        // Auto-pin expander column to left (right after selection if present)
        if (renderSubComponent && !merged.left!.includes(EXPANDER_COLUMN_ID)) {
            const selIdx = merged.left!.indexOf(SELECTION_COLUMN_ID);
            merged.left!.splice(selIdx + 1, 0, EXPANDER_COLUMN_ID);
        }
        return merged;
    });
    // Capture the initial merged pinning so ColumnConfigPanel reset can restore it
    const initialMergedPinningRef = useRef<ColumnPinningState>(columnPinning);
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [editingRowIds, setEditingRowIds] = useState<Record<string, boolean>>({});
    const [pendingEdits, setPendingEdits] = useState<Record<string, Record<string, unknown>>>({});
    const pendingEditsRef = useRef<Record<string, Record<string, unknown>>>({});
    const tableRef = useRef<ReturnType<typeof useReactTable<TData>>>(null!);
    const [filtersVisible, setFiltersVisible] = useState(initialFiltersVisible);

    //  Scroll-to-top - bumps a counter that Content watches via useLayoutEffect
    const [scrollToTopCounter, setScrollToTopCounter] = useState(0);
    const scrollToTop = useCallback(() => {
        setScrollToTopCounter((c) => c + 1);
    }, []);

    //  Pending-edit helpers (buffer cell edits until commit/cancel)

    const setPendingEdit = useCallback((rowId: string, columnId: string, value: unknown) => {
        pendingEditsRef.current = {
            ...pendingEditsRef.current,
            [rowId]: { ...(pendingEditsRef.current[rowId] ?? {}), [columnId]: value },
        };
        setPendingEdits(pendingEditsRef.current);
    }, []);

    const commitRow = useCallback(
        (rowId: string) => {
            const rowEdits = pendingEditsRef.current[rowId];
            if (rowEdits && updateData) {
                for (const [columnId, value] of Object.entries(rowEdits)) {
                    updateData(rowId, columnId, value);
                }
            }
            const next = { ...pendingEditsRef.current };
            delete next[rowId];
            pendingEditsRef.current = next;
            setPendingEdits(next);
            setEditingRowIds((prev) => {
                const n = { ...prev };
                delete n[rowId];
                return n;
            });
        },
        [updateData],
    );

    const cancelRow = useCallback((rowId: string) => {
        const next = { ...pendingEditsRef.current };
        delete next[rowId];
        pendingEditsRef.current = next;
        setPendingEdits(next);
        setEditingRowIds((prev) => {
            const n = { ...prev };
            delete n[rowId];
            return n;
        });
    }, []);

    const deleteRow = useCallback(
        (rowId: string) => {
            // Clean up editing state
            setEditingRowIds((prev) => {
                const n = { ...prev };
                delete n[rowId];
                return n;
            });
            // Clean up pending edits
            const next = { ...pendingEditsRef.current };
            delete next[rowId];
            pendingEditsRef.current = next;
            setPendingEdits(next);
            // Call consumer's delete callback
            onDeleteRow?.(rowId);
        },
        [onDeleteRow],
    );

    //  Attach custom filter/sort functions based on meta
    // When manualFiltering is on, column filters are handled server-side -
    // attach a pass-through filterFn so column filters are no-ops locally
    // while the global filter still runs client-side.
    const processedColumns = useMemo(() => {
        const mapped = columns.map((col) => {
            const meta = col.meta as ColumnMeta | undefined;
            if (manualFiltering) {
                return meta?.filterType ? ({ ...col, filterFn: () => true } as VirtualTableColumnDef<TData>) : col;
            }
            if (meta?.filterType && !col.filterFn) {
                return { ...col, filterFn: filterFnMap[meta.filterType] } as VirtualTableColumnDef<TData>;
            }
            return col;
        });
        const prefix: VirtualTableColumnDef<TData>[] = [];
        // Prepend selection checkbox column when row selection is enabled
        if (enableRowSelection) {
            prefix.push(SelectionCheckboxColumn<TData>() as VirtualTableColumnDef<TData>);
        }
        // Prepend expander column when sub-component rendering is enabled
        if (renderSubComponent) {
            prefix.push(ExpanderColumn<TData>() as VirtualTableColumnDef<TData>);
        }
        return [...prefix, ...mapped];
    }, [columns, enableRowSelection, selectionColumnPinned, renderSubComponent]);

    //  Track which columns define a custom cell renderer
    // TanStack merges a default `cell` onto every column, so checking
    // column.columnDef.cell is always truthy.  We inspect processedColumns
    // (before TanStack) so internal columns (selection, actions) are included.
    const customCellColumnIds = useMemo(() => {
        const set = new Set<string>();
        for (const col of processedColumns) {
            if (col.cell) {
                const id = ((col as unknown as Record<string, unknown>).accessorKey as string | undefined) ?? col.id;
                if (id) set.add(id);
            }
        }
        return set;
    }, [processedColumns]);

    //  TanStack Table Instance
    const table = useReactTable<TData>({
        data,
        columns: processedColumns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            columnVisibility,
            columnOrder,
            columnPinning,
            columnSizing,
            rowSelection,
            expanded,
        },
        meta: {
            updateData,
            editingRowIds,
            setEditingRowIds,
            pendingEdits,
            setPendingEdit,
            commitRow,
            cancelRow,
            deleteRow,
        },
        filterFns: {
            text: filterFnMap.text,
            select: filterFnMap.select,
            'number-range': filterFnMap['number-range'],
            'date-range': filterFnMap['date-range'],
            boolean: filterFnMap.boolean,
            search: filterFnMap.search,
            tags: filterFnMap.tags,
            object: filterFnMap.object,
        },
        getRowId,
        enableColumnResizing,
        enableSorting,
        enableFilters: enableColumnFilters || enableGlobalFilter,
        enableColumnFilters,
        enableGlobalFilter,
        enableColumnPinning,
        enableHiding: enableColumnVisibility,
        enableRowSelection,
        enableMultiRowSelection,
        enableMultiSort: false,
        columnResizeMode: 'onChange',
        getColumnCanGlobalFilter: (column) =>
            (column.getIsVisible() && (column.columnDef.enableGlobalFilter ?? true)) || ((column.columnDef.meta as ColumnMeta)?.forceGlobalSearchEvenIfHidden ?? false),
        // Row expansion
        onExpandedChange: setExpanded,
        getRowCanExpand: getRowCanExpand ?? (() => !!renderSubComponent),

        // Sorting
        manualSorting: manualSorting ?? false,
        onSortingChange: (updater) => {
            const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
            setSorting(newSorting);
            externalOnSortingChange?.(updater);
        },

        // Filtering - always run client-side so global filter works.
        // When manualFiltering is on, column filterFns are pass-through no-ops.
        manualFiltering: false,
        onColumnFiltersChange: (updater) => {
            const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
            setColumnFilters(newFilters);
            externalOnFilteringChange?.(updater);
        },
        onGlobalFilterChange: (updater) => {
            const newGlobal = typeof updater === 'function' ? updater(globalFilter) : updater;
            setGlobalFilter(newGlobal);
            externalOnGlobalFilterChange?.(updater);
        },

        // Column features
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        onColumnPinningChange: setColumnPinning,
        onColumnSizingChange: setColumnSizing,

        // Row selection
        onRowSelectionChange: (updater) => {
            const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
            setRowSelection(newSelection);
            if (onRowSelectionChange) {
                const selectedRows = Object.keys(newSelection)
                    .filter((key) => newSelection[key])
                    .map((key) => {
                        const row = table.getRow(key);
                        return row.original;
                    });
                onRowSelectionChange(selectedRows);
            }
        },

        // Row models
        getCoreRowModel: getCoreRowModel(),
        ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
        // Always provide filtered row model so global filter works even with manualFiltering
        getFilteredRowModel: getFilteredRowModel(),
        ...(renderSubComponent ? { getExpandedRowModel: getExpandedRowModel() } : {}),
    });

    // Keep ref in sync so commitRow can access the table without a circular dependency
    tableRef.current = table;

    //  Auto column sizing
    const visibleColumnKey = table
        .getVisibleLeafColumns()
        .map((c) => c.id)
        .join(',');

    useAutoColumnSizing(table, containerWidth, visibleColumnKey, setColumnSizing);

    //  Context Value
    // NOT memoized: useReactTable returns a stable ref, so a useMemo keyed
    // on `table` would never invalidate, starving child components of
    // re-renders when sorting/filtering/visibility state changes.
    const contextValue: VirtualTableContextValue<TData> = {
        table,
        classNames,
        containerRef,
        containerHeight,
        containerWidth,
        maxPinnedColumns,
        customCellColumnIds,
        isLoading,
        loadingMessage,
        error,
        errorTitle,
        onRetry,
        isRetrying,
        retryLabel,
        emptyTitle,
        emptyMessage,
        emptyIcon,
        estimateRowHeight,
        overscan,
        filtersVisible,
        setFiltersVisible,
        sorting,
        columnFilters,
        globalFilter,
        columnVisibility,
        columnOrder,
        columnPinning,
        columnSizing,
        rowSelection,
        onRowClick,
        initialColumnPinning: initialMergedPinningRef.current,
        initialColumnVisibility,
        initialColumnOrder,
        initialSorting,
        initialColumnFilters,
        renderSubComponent,
        editingRowIds,
        setEditingRowIds,
        pendingEdits,
        onAddRow,
        addRowLabel,
        onDeleteRow,
        deleteRowLabel,
        scrollToTopCounter,
        scrollToTop,
    };

    return (
        <VirtualTableContext.Provider value={contextValue as unknown as VirtualTableContextValue<never>}>
            <div ref={containerRef} className={twMerge('flex h-full w-full flex-col overflow-hidden rounded-lg border border-gray-200', classNames.root)}>
                {children}
            </div>
        </VirtualTableContext.Provider>
    );
}

//  Attach Sub-components to form Compound Component

const VirtualTable = VirtualTableInner as typeof VirtualTableInner & VirtualTableComposition;
VirtualTable.Toolbar = Toolbar;
VirtualTable.Content = Content;
VirtualTable.GlobalSearch = GlobalSearch;
VirtualTable.ColumnConfig = ColumnConfigPanel;
VirtualTable.FilterConfig = FilterConfig;
VirtualTable.SortConfig = SortConfig;
VirtualTable.RowInfo = RowInfo;
VirtualTable.SelectedRows = SelectedRows;
VirtualTable.AddRow = AddRow;
VirtualTable.DeleteRow = DeleteRow;
VirtualTable.ExportData = ExportData;

export default VirtualTable;
