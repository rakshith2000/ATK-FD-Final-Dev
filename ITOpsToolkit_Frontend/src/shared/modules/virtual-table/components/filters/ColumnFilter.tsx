import { type FC, useMemo } from 'react';
import type { Column, RowData } from '@tanstack/react-table';
import { useVirtualTableContext } from '../../VirtualTableContext';
import type { ColumnMeta, CustomFilterComponentProps, FilterOption } from '../../types';
import TextFilter from './TextFilter';
import SelectFilter from './SelectFilter';
import NumberRangeFilter from './NumberRangeFilter';
import DateRangeFilter from './DateRangeFilter';
import BooleanFilter from './BooleanFilter';
import TagFilter from './TagFilter';

interface Props<TData extends RowData> {
    column: Column<TData, unknown>;
}

function ColumnFilter<TData extends RowData>({ column }: Props<TData>) {
    const { table } = useVirtualTableContext<TData>();
    const meta = column.columnDef.meta as ColumnMeta | undefined;

    // No filter configured - render a subtle placeholder so the cell isn't blank
    if (!meta?.filterType || !column.getCanFilter()) {
        return <span className="block py-1 text-center text-[10px] text-gray-300 select-none">&mdash;</span>;
    }

    // Custom filter component override - delegate entirely to the consumer
    if (meta.filterComponent) {
        // Safe cast: ColumnMeta loses TData when accessed via columnDef.meta, but
        // the component was originally typed for the correct TData at definition time.
        const CustomFilter = meta.filterComponent as React.ComponentType<CustomFilterComponentProps<TData>>;
        return <CustomFilter value={column.getFilterValue()} onChange={(val) => column.setFilterValue(val)} column={column} table={table} />;
    }

    // Resolve filterOptions - supports static array or function(data, columnId)
    const resolvedOptions = useMemo<FilterOption[]>(() => {
        if (!meta.filterOptions) return [];
        if (typeof meta.filterOptions === 'function') {
            return meta.filterOptions({ data: table.options.data, columnId: column.id });
        }
        return meta.filterOptions;
    }, [meta.filterOptions, table.options.data, column.id]);

    const filterValue = column.getFilterValue();

    switch (meta.filterType) {
        case 'text':
        case 'search':
            return (
                <TextFilter
                    value={(filterValue as string) ?? ''}
                    onChange={(val) => column.setFilterValue(val || undefined)}
                    placeholder={meta.filterPlaceholder ?? `Filter ${column.id}...`}
                />
            );

        case 'select':
            return (
                <SelectFilter
                    value={(filterValue as string | string[]) ?? (meta.filterMultiSelect ? [] : '')}
                    onChange={(val) => {
                        const isEmpty = Array.isArray(val) ? val.length === 0 : !val;
                        column.setFilterValue(isEmpty ? undefined : val);
                    }}
                    options={resolvedOptions}
                    optionsAsync={meta.filterOptionsAsync}
                    optionsAsyncDebounce={meta.filterOptionsAsyncDebounce}
                    multiple={meta.filterMultiSelect}
                    placeholder={meta.filterPlaceholder ?? `Select ${column.id}...`}
                    onRetry={meta.filterOptionsRetry}
                    onRefetch={meta.filterOptionsRefetch}
                />
            );

        case 'number-range':
            return (
                <NumberRangeFilter
                    value={(filterValue as [number | undefined, number | undefined]) ?? [undefined, undefined]}
                    onChange={(val) => {
                        const isEmpty = val[0] === undefined && val[1] === undefined;
                        column.setFilterValue(isEmpty ? undefined : val);
                    }}
                />
            );

        case 'date-range':
            return (
                <DateRangeFilter
                    value={(filterValue as [string | undefined, string | undefined]) ?? [undefined, undefined]}
                    onChange={(val) => {
                        const isEmpty = !val[0] && !val[1];
                        column.setFilterValue(isEmpty ? undefined : val);
                    }}
                />
            );

        case 'boolean':
            return <BooleanFilter value={filterValue as boolean | undefined} onChange={(val) => column.setFilterValue(val)} />;

        case 'tags': {
            // Extract all unique tags from pre-filtered rows for the tag filter dropdown.
            const separator = meta.tagSeparator ?? ',';
            const availableTags = [
                ...new Set(
                    table.getPreFilteredRowModel().rows.flatMap((row) => {
                        const cellVal = String(row.getValue(column.id) ?? '');
                        return cellVal
                            .split(separator)
                            .map((t: string) => t.trim())
                            .filter(Boolean);
                    }),
                ),
            ].sort((a, b) => a.localeCompare(b));
            return (
                <TagFilter
                    value={(filterValue as string[]) ?? []}
                    onChange={(val) => {
                        column.setFilterValue(val.length === 0 ? undefined : val);
                    }}
                    availableTags={availableTags}
                    placeholder={meta.filterPlaceholder ?? `Filter tags...`}
                />
            );
        }

        default:
            return null;
    }
}

(ColumnFilter as FC).displayName = 'VirtualTable.ColumnFilter';
export default ColumnFilter;
