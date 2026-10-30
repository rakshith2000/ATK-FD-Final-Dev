import { type FC, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Cell, RowData } from '@tanstack/react-table';
import type { ColumnMeta, EditCellProps as EditCellPropsType, FilterOption, EditType } from '../types';
import InputEditor from './editors/InputEditor';
import BooleanEditor from './editors/BooleanEditor';
import SelectEditor from './editors/SelectEditor';
import TagEditor from './editors/TagEditor';

//  Props
interface EditableCellProps<TData extends RowData = RowData> {
    cell: Cell<TData, unknown>;
    className?: string;
    errorClassName?: string;
}

//  Map filterType -> editType
const filterTypeToEditType: Record<string, EditType> = {
    text: 'text',
    search: 'text',
    select: 'select',
    'number-range': 'number',
    'date-range': 'date',
    boolean: 'boolean',
    tags: 'tags',
};

//  Main EditableCell
function EditableCell<TData extends RowData>({ cell, className, errorClassName }: EditableCellProps<TData>) {
    const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
    const table = cell.getContext().table;
    const row = cell.getContext().row;
    const column = cell.getContext().column;
    const dataValue = cell.getValue();

    // If this cell was already edited (e.g. row scrolled out of viewport and
    // back in), restore the buffered value instead of the stale data value.
    const pendingValue = table.options.meta?.pendingEdits?.[row.id]?.[column.id];
    const initialValue = pendingValue !== undefined ? pendingValue : dataValue;

    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState<string | null>(null);
    // Ref tracks the latest value synchronously. When the SelectEditor
    // calls onChange() then onBlur() in the same tick, React hasn't
    // flushed the setValue yet - handleBlur would read the stale
    // closure `value`. The ref is updated synchronously so handleBlur
    // always sees the freshest value.
    const valueRef = useRef(initialValue);

    // Sync when external data or pending value changes
    useEffect(() => {
        const effective = pendingValue !== undefined ? pendingValue : dataValue;
        setValue(effective);
        valueRef.current = effective;
        setError(null);
    }, [dataValue, pendingValue]);

    const validate = useCallback(
        (val: unknown) => {
            if (meta?.editValidation) {
                const result = meta.editValidation(val);
                setError(result);
                return result === null;
            }
            return true;
        },
        [meta?.editValidation],
    );

    const handleChange = (newValue: unknown) => {
        setValue(newValue);
        valueRef.current = newValue;
        validate(newValue);
    };

    const handleBlur = () => {
        const latest = valueRef.current;
        if (validate(latest)) {
            // Buffer the edit - it will be flushed by commitRow or discarded by cancelRow.
            table.options.meta?.setPendingEdit?.(row.id, column.id, latest);
        }
    };

    const hasError = !!error;

    //  Custom edit component
    if (meta?.editComponent) {
        // Safe cast: ColumnMeta loses TData when accessed via columnDef.meta, but
        // the component was originally typed for the correct TData at definition time.
        const CustomComponent = meta.editComponent as React.ComponentType<EditCellPropsType<TData>>;
        return (
            <div>
                <CustomComponent value={value} onChange={handleChange} onBlur={handleBlur} row={row} column={column} table={table} validationError={error} />
                {error && <p className={twMerge('mt-0.5 text-[10px] text-red-500', errorClassName)}>{error}</p>}
            </div>
        );
    }

    //  Resolve edit type (fallback to filterType mapping)
    const editType: EditType = meta?.editType ?? (meta?.filterType ? (filterTypeToEditType[meta.filterType] ?? 'text') : 'text');

    //  Resolve options for select editor
    const resolvedOptions = useMemo<FilterOption[]>(() => {
        const opts = meta?.editOptions ?? meta?.filterOptions;
        if (!opts) return [];
        if (typeof opts === 'function') {
            return opts({ data: table.options.data, columnId: column.id });
        }
        return opts;
    }, [meta?.editOptions, meta?.filterOptions, table.options.data, column.id]);

    const asyncFetcher = meta?.editOptionsAsync ?? meta?.filterOptionsAsync;

    //  Render editor
    let editor: React.ReactNode;

    switch (editType) {
        case 'select':
            editor = (
                <SelectEditor
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    options={resolvedOptions}
                    optionsAsync={asyncFetcher}
                    optionsAsyncDebounce={meta?.editOptionsAsyncDebounce ?? meta?.filterOptionsAsyncDebounce}
                    placeholder={meta?.editPlaceholder ?? meta?.filterPlaceholder}
                    hasError={hasError}
                    className={className}
                    onRetry={meta?.editOptionsRetry}
                    onRefetch={meta?.editOptionsRefetch}
                />
            );
            break;
        case 'boolean':
            editor = <BooleanEditor value={value} onChange={handleChange} onBlur={handleBlur} hasError={hasError} className={className} />;
            break;
        case 'number':
            editor = (
                <InputEditor
                    type="number"
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={meta?.editPlaceholder}
                    hasError={hasError}
                    className={className}
                />
            );
            break;
        case 'date':
            editor = (
                <InputEditor type="date" value={value} onChange={handleChange} onBlur={handleBlur} placeholder={meta?.editPlaceholder} hasError={hasError} className={className} />
            );
            break;
        case 'tags':
            editor = (
                <TagEditor
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    separator={meta?.tagSeparator}
                    placeholder={meta?.editPlaceholder}
                    hasError={hasError}
                    className={className}
                />
            );
            break;
        case 'text':
        default:
            editor = (
                <InputEditor
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={meta?.editPlaceholder ?? meta?.filterPlaceholder}
                    hasError={hasError}
                    className={className}
                />
            );
            break;
    }

    return (
        <div>
            {editor}
            {error && <p className={twMerge('mt-0.5 text-[10px] text-red-500', errorClassName)}>{error}</p>}
        </div>
    );
}

(EditableCell as FC).displayName = 'VirtualTable.EditableCell';
export default EditableCell;
