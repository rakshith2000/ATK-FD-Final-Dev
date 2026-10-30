import type { ReactNode, ReactElement, ComponentType } from 'react';
import type {
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    ColumnOrderState,
    ColumnPinningState,
    ColumnSizingState,
    Table,
    Row,
    Column,
    Header,
    Cell,
    OnChangeFn,
    RowData,
    FilterFn,
} from '@tanstack/react-table';
import type { ClassNameValue } from 'tailwind-merge';

//  Module Augmentation

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface TableMeta<TData extends RowData> {
        updateData?: (rowId: string, columnId: string, value: unknown) => void;
        editingRowIds?: Record<string, boolean>;
        setEditingRowIds?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
        /** Buffered edits keyed by rowId -> columnId -> value. Written on blur, flushed on commit. */
        pendingEdits?: Record<string, Record<string, unknown>>;
        /** Write a single cell value to the pending buffer (does NOT call updateData). */
        setPendingEdit?: (rowId: string, columnId: string, value: unknown) => void;
        /** Flush all pending edits for a row via updateData and exit editing mode. */
        commitRow?: (rowId: string) => void;
        /** Discard all pending edits for a row and exit editing mode. */
        cancelRow?: (rowId: string) => void;
        /** Delete a row: cleans up editing/pending state and calls the consumer's onDeleteRow callback. */
        deleteRow?: (rowId: string) => void;
    }

    interface FilterFns {
        text: FilterFn<unknown>;
        select: FilterFn<unknown>;
        'number-range': FilterFn<unknown>;
        'date-range': FilterFn<unknown>;
        boolean: FilterFn<unknown>;
        search: FilterFn<unknown>;
        tags: FilterFn<unknown>;
        object: FilterFn<unknown>;
    }
}

//  Filter Types

export type FilterType = 'text' | 'select' | 'number-range' | 'date-range' | 'boolean' | 'search' | 'tags' | 'object';
export type EditType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'tags';

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterOptionsArgs {
    data: unknown[];
    columnId: string;
}

//  Edit Cell Props

export interface EditCellProps<TData extends RowData = RowData> {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    row: Row<TData>;
    column: Column<TData, unknown>;
    table: Table<TData>;
    validationError?: string | null;
}

//  Custom Filter Component Props

export interface CustomFilterComponentProps<TData extends RowData = RowData> {
    value: unknown;
    onChange: (value: unknown) => void;
    column: Column<TData, unknown>;
    table: Table<TData>;
}

//  Column Meta

export interface ColumnMeta<TData extends RowData = RowData> {
    /** Display label shown in ColumnConfig panel. Falls back to header string or column id. */
    label?: string;

    //  Filter configuration
    filterType?: FilterType;
    /** Static array or a function that derives options from the full (unfiltered) table data */
    filterOptions?: FilterOption[] | ((args: FilterOptionsArgs) => FilterOption[]);
    /** Async option fetcher - receives the current search term for server-side search.
     *  Called with '' on initial open, then debounced on each keystroke. */
    filterOptionsAsync?: (searchTerm: string) => Promise<FilterOption[]>;
    /** Debounce interval (ms) for filterOptionsAsync. Defaults to 300. */
    filterOptionsAsyncDebounce?: number;
    filterOptionsRetry?: () => void;
    filterOptionsRefetch?: () => void;
    filterPlaceholder?: string;
    filterMultiSelect?: boolean;
    /** Custom filter component - overrides the default filter type renderer. */
    filterComponent?: ComponentType<CustomFilterComponentProps<TData>>;

    //  Edit configuration
    /** Whether the column is editable. Boolean or per-row callback. */
    canEdit?: boolean | ((row: Row<TData>) => boolean);
    /** Edit input type. Falls back to filterType mapping if not specified. */
    editType?: EditType;
    /** Custom edit component - overrides the default edit type renderer. */
    editComponent?: ComponentType<EditCellProps<TData>>;
    /** Static options or a function that derives options for select-type editors. */
    editOptions?: FilterOption[] | ((args: FilterOptionsArgs) => FilterOption[]);
    /** Async option fetcher for select-type editors. */
    editOptionsAsync?: (searchTerm: string) => Promise<FilterOption[]>;
    /** Debounce interval (ms) for editOptionsAsync. Defaults to 300. */
    editOptionsAsyncDebounce?: number;
    editOptionsRetry?: () => void;
    editOptionsRefetch?: () => void;
    /** Placeholder text for the edit input. */
    editPlaceholder?: string;
    /** Validation function. Returns null if valid, or an error message string. */
    editValidation?: (value: unknown) => string | null;

    //  Tag configuration
    /** Separator used to split/join tag strings. Defaults to `','`. Applies to both filter and editor when filterType/editType is `'tags'`. */
    tagSeparator?: string;

    forceGlobalSearchEvenIfHidden?: boolean;
}

/** @deprecated Use `ColumnMeta` instead. */
export type FilterMeta = ColumnMeta;

//  Column Definition

export type VirtualTableColumnDef<TData extends RowData> = ColumnDef<TData, unknown> & {
    meta?: ColumnMeta<TData> & Record<string, unknown>;
};

//  Action Column

export interface RowAction<TData extends RowData> {
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: (row: TData) => void;
    hidden?: (row: TData) => boolean;
    disabled?: (row: TData) => boolean;
    className?: string;
}

export interface ActionColumnConfig<TData extends RowData> {
    actions: RowAction<TData>[];
    columnId?: string;
    header?: string;
    size?: number;
}

//  Style Overrides

export interface VirtualTableClassNames {
    root?: ClassNameValue;
    toolbar?: ClassNameValue;
    tableWrapper?: ClassNameValue;
    table?: ClassNameValue;
    thead?: ClassNameValue;
    theadRow?: ClassNameValue;
    theadCell?: ClassNameValue;
    filterRow?: ClassNameValue;
    filterCell?: ClassNameValue;
    tbody?: ClassNameValue;
    tbodyRow?: ClassNameValue;
    tbodyCell?: ClassNameValue;
    pinnedLeft?: ClassNameValue;
    pinnedRight?: ClassNameValue;
    sortIcon?: ClassNameValue;
    resizeHandle?: ClassNameValue;
    emptyState?: ClassNameValue;
    loadingState?: ClassNameValue;
    globalSearch?: ClassNameValue;
    columnConfigPanel?: ClassNameValue;
    columnConfigTrigger?: ClassNameValue;
    filterConfigPanel?: ClassNameValue;
    filterConfigTrigger?: ClassNameValue;
    sortConfigPanel?: ClassNameValue;
    sortConfigTrigger?: ClassNameValue;
    searchHighlight?: ClassNameValue;
    columnFilterHighlight?: ClassNameValue;
    expandedSubRow?: ClassNameValue;
    editingRow?: ClassNameValue;
    editInput?: ClassNameValue;
    editInputError?: ClassNameValue;
    exportDataTrigger?: ClassNameValue;
}

//  Data Mode
// Change callbacks are always available. In local mode they act as observers
// (local sort/filter still runs); in remote/manual mode the consumer is
// responsible for fetching new data.

interface LocalDataConfig {
    manualSorting?: false;
    manualFiltering?: false;
    /** Called when sorting changes - use to trigger side effects (e.g. API call for specific columns). Local sorting still runs. */
    onSortingChange?: OnChangeFn<SortingState>;
    /** Called when column filters change - use to trigger side effects. Local filtering still runs. */
    onFilteringChange?: OnChangeFn<ColumnFiltersState>;
    /** Called when the global search value changes. Local filtering still runs. */
    onGlobalFilterChange?: OnChangeFn<string>;
    rowCount?: never;
}

interface RemoteDataConfig {
    manualSorting: true;
    manualFiltering: true;
    onSortingChange: OnChangeFn<SortingState>;
    onFilteringChange: OnChangeFn<ColumnFiltersState>;
    onGlobalFilterChange?: OnChangeFn<string>;
    rowCount?: number;
}

type DataModeConfig = LocalDataConfig | RemoteDataConfig;

//  Row Selection

export interface RowSelectionConfig<TData extends RowData> {
    enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
    enableMultiRowSelection?: boolean;
    onRowSelectionChange?: (selectedRows: TData[]) => void;
    /** Pin the auto-generated selection checkbox column. Defaults to unpinned. */
    selectionColumnPinned?: 'left' | 'right';
    /** Called when a row is clicked. */
    onRowClick?: (row: TData, event: React.MouseEvent, rowObj: Row<TData>) => void;
}

//  Main Props

export type VirtualTableProps<TData extends RowData> = {
    data: TData[];
    columns: VirtualTableColumnDef<TData>[];
    classNames?: VirtualTableClassNames;
    estimateRowHeight?: number;
    overscan?: number;
    enableColumnResizing?: boolean;
    enableSorting?: boolean;
    enableColumnFilters?: boolean;
    enableGlobalFilter?: boolean;
    enableColumnPinning?: boolean;
    enableColumnVisibility?: boolean;
    maxPinnedColumns?: number;
    getRowId?: (row: TData, index: number) => string;
    isLoading?: boolean;
    loadingMessage?: string;
    error?: Error | null;
    errorTitle?: string;
    onRetry?: () => unknown;
    isRetrying?: boolean;
    retryLabel?: string;
    emptyTitle?: string;
    emptyMessage?: string;
    emptyIcon?: ReactNode;
    initialSorting?: SortingState;
    initialColumnFilters?: ColumnFiltersState;
    initialColumnVisibility?: VisibilityState;
    initialColumnOrder?: ColumnOrderState;
    initialColumnPinning?: ColumnPinningState;
    /** Whether the column filter row is visible on mount. Defaults to `true`. */
    initialFiltersVisible?: boolean;

    //  Row Expansion
    /** Render function for the expanded sub-component below a row. */
    renderSubComponent?: (props: { row: Row<TData> }) => ReactElement;
    /** Predicate that determines whether a row can be expanded. */
    getRowCanExpand?: (row: Row<TData>) => boolean;

    //  Inline Editing
    /** Callback invoked when a cell value is updated via inline editing. */
    updateData?: (rowId: string, columnId: string, value: unknown) => void;

    //  Add Row
    /** Callback invoked when the Add Row button is clicked. Must add a new row to the data array and return the new row's id so the table can auto-enter edit mode. Return `undefined` to skip auto-edit. */
    onAddRow?: () => string | undefined | void;
    /** Label for the Add Row toolbar button. Defaults to `'Add Row'`. */
    addRowLabel?: string;

    //  Delete Row
    /** Callback invoked to delete a row. Receives the row id. The consumer must remove the row from the data array. */
    onDeleteRow?: (rowId: string) => void;
    /** Label for the Delete Row toolbar button. Defaults to `'Delete'`. */
    deleteRowLabel?: string;

    children: ReactNode;
} & DataModeConfig &
    RowSelectionConfig<TData>;

//  Context Value

export interface VirtualTableContextValue<TData extends RowData> {
    table: Table<TData>;
    classNames: VirtualTableClassNames;
    containerRef: React.RefObject<HTMLDivElement | null>;
    containerHeight: number;
    containerWidth: number;
    maxPinnedColumns: number;
    customCellColumnIds: Set<string>;
    isLoading: boolean;
    loadingMessage?: string;
    error: Error | null;
    errorTitle?: string;
    onRetry?: () => unknown;
    isRetrying: boolean;
    retryLabel: string;
    emptyTitle: string;
    emptyMessage: string;
    emptyIcon?: ReactNode;
    estimateRowHeight: number;
    overscan: number;
    filtersVisible: boolean;
    setFiltersVisible: React.Dispatch<React.SetStateAction<boolean>>;
    // Table state - drives context reference changes for consumer re-renders
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    globalFilter: string;
    columnVisibility: VisibilityState;
    columnOrder: ColumnOrderState;
    columnPinning: ColumnPinningState;
    columnSizing: ColumnSizingState;
    rowSelection: Record<string, boolean>;
    onRowClick?: (row: TData, event: React.MouseEvent, rowObj: Row<TData>) => void;
    /** The initial merged pinning state (includes selectionColumnPinned and initialColumnPinning). Used by ColumnConfigPanel reset. */
    initialColumnPinning: ColumnPinningState;
    initialColumnVisibility: VisibilityState;
    initialColumnOrder: ColumnOrderState;
    initialSorting: SortingState;
    initialColumnFilters: ColumnFiltersState;

    //  Row Expansion
    renderSubComponent?: (props: { row: Row<TData> }) => ReactElement;

    //  Inline Editing
    editingRowIds: Record<string, boolean>;
    setEditingRowIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    pendingEdits: Record<string, Record<string, unknown>>;

    //  Add Row
    onAddRow?: () => string | undefined | void;
    addRowLabel?: string;

    //  Delete Row
    onDeleteRow?: (rowId: string) => void;
    deleteRowLabel?: string;

    //  Scroll
    /** Counter incremented by scrollToTop(). Content watches this via useLayoutEffect. */
    scrollToTopCounter: number;
    /** Scroll the table viewport to the top after the next React commit. */
    scrollToTop: () => void;
}

//  Sub-component Props

export interface ToolbarProps {
    children?: ReactNode;
    className?: ClassNameValue;
}

export interface AddRowProps {
    /** Override the button label. Falls back to `addRowLabel` prop on VirtualTable, then `'Add Row'`. */
    label?: string;
    /** Optional icon rendered before the label. */
    icon?: ReactNode;
    /** Fully override the click handler - when provided, `onAddRow` and auto-edit are skipped entirely. Use this to open a custom modal or form. */
    onClick?: () => void;
    className?: ClassNameValue;
}

export interface DeleteRowProps {
    /** Override the button label. Falls back to `deleteRowLabel` prop on VirtualTable, then `'Delete'`. */
    label?: string;
    /** Optional icon rendered before the label. */
    icon?: ReactNode;
    /** Fully override the click handler - when provided, `onDeleteRow` and default behavior are skipped entirely. */
    onClick?: () => void;
    className?: ClassNameValue;
}

export interface ContentProps {
    className?: ClassNameValue;
}

export interface GlobalSearchProps {
    placeholder?: string;
    debounceMs?: number;
    className?: ClassNameValue;
    childrenClassNames?: { searchIcon?: string; input?: string; clearIcon?: string };
    searchIconSize?: number;
    clearIconSize?: number;
}

export interface ColumnConfigPanelProps {
    className?: ClassNameValue;
    triggerClassName?: ClassNameValue;
    childrenClassNames?: {
        triggerIcon?: string;
        triggerLabel?: string;
        header?: string;
        title?: string;
        actions?: string;
        showAllButton?: string;
        resetButton?: string;
        resetIcon?: string;
        warning?: string;
        list?: string;
        row?: string;
        dragIcon?: string;
        columnLabel?: string;
        pinnedLabel?: string;
        rowActions?: string;
        pinButton?: string;
        unpinButton?: string;
        visibilityButton?: string;
        footer?: string;
        footerText?: string;
    };
    settingsIconSize?: number;
    resetIconSize?: number;
    dragIconSize?: number;
    pinIconSize?: number;
    visibilityIconSize?: number;
}

export interface FilterConfigPanelProps {
    className?: ClassNameValue;
    triggerClassName?: ClassNameValue;
}

export interface SortConfigPanelProps {
    className?: ClassNameValue;
    triggerClassName?: ClassNameValue;
}

export interface ExportDataProps {
    /** Base filename (without extension) for the exported file. Defaults to `'table-export'`. */
    filename?: string;
    /** Button label. Defaults to `'Export CSV'`. */
    label?: string;
    className?: ClassNameValue;
    triggerClassName?: ClassNameValue;
    childrenClassNames?: {
        triggerIcon?: string;
        triggerLabel?: string;
        spinner?: string;
    };
    triggerIconSize?: number;
    /** Called when the export starts. */
    onExportStart?: () => void;
    /** Called when the export completes successfully. */
    onExportComplete?: () => void;
    /** Called when the export fails. */
    onExportError?: (error: Error) => void;
}

export interface HeaderCellProps<TData extends RowData> {
    header: Header<TData, unknown>;
    className?: ClassNameValue;
}

export interface BodyCellProps<TData extends RowData> {
    cell: Cell<TData, unknown>;
    className?: ClassNameValue;
}

export interface ColumnFilterProps {
    columnId: string;
    filterType: FilterType;
    filterOptions?: FilterOption[];
    filterOptionsAsync?: () => Promise<FilterOption[]>;
    filterPlaceholder?: string;
    filterMultiSelect?: boolean;
    className?: ClassNameValue;
}

export interface TextFilterProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: ClassNameValue;
}

export interface SelectFilterProps {
    value: string | string[];
    onChange: (value: string | string[]) => void;
    options: FilterOption[];
    optionsAsync?: (searchTerm: string) => Promise<FilterOption[]>;
    optionsAsyncDebounce?: number;
    multiple?: boolean;
    placeholder?: string;
    className?: ClassNameValue;
    onRetry?: () => void;
    onRefetch?: () => void;
}

export interface NumberRangeFilterProps {
    value: [number | undefined, number | undefined];
    onChange: (value: [number | undefined, number | undefined]) => void;
    placeholder?: [string?, string?];
    className?: ClassNameValue;
}

export interface DateRangeFilterProps {
    value: [string | undefined, string | undefined];
    onChange: (value: [string | undefined, string | undefined]) => void;
    className?: ClassNameValue;
}

export interface BooleanFilterProps {
    value: boolean | undefined;
    onChange: (value: boolean | undefined) => void;
    labels?: { true?: string; false?: string; all?: string };
    className?: ClassNameValue;
}

export interface TagFilterProps {
    value: string[];
    onChange: (value: string[]) => void;
    /** All unique tags extracted from the column data. */
    availableTags: string[];
    placeholder?: string;
    className?: ClassNameValue;
}
