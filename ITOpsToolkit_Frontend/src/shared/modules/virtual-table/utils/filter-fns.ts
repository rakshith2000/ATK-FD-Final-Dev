import stringifyObjectValue from '@/shared/utils/stringify-object-value';
import type { FilterFn } from '@tanstack/react-table';

export const textFilterFn: FilterFn<unknown> = (row, columnId, filterValue: string) => {
    if (!filterValue) return true;
    const cellValue = String(row.getValue(columnId) ?? '').toLowerCase();
    return cellValue.includes(filterValue.toLowerCase());
};

export const selectFilterFn: FilterFn<unknown> = (row, columnId, filterValue: string | string[]) => {
    if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true;
    const cellValue = String(row.getValue(columnId) ?? '');
    if (Array.isArray(filterValue)) {
        return filterValue.includes(cellValue);
    }
    return cellValue === filterValue;
};

export const numberRangeFilterFn: FilterFn<unknown> = (row, columnId, filterValue: [number | undefined, number | undefined]) => {
    if (!filterValue) return true;
    const [min, max] = filterValue;
    const cellValue = Number(row.getValue(columnId));
    if (Number.isNaN(cellValue)) return false;
    if (min !== undefined && cellValue < min) return false;
    if (max !== undefined && cellValue > max) return false;
    return true;
};

export const dateRangeFilterFn: FilterFn<unknown> = (row, columnId, filterValue: [string | undefined, string | undefined]) => {
    if (!filterValue) return true;
    const [from, to] = filterValue;
    const cellValue = row.getValue(columnId);
    if (!cellValue) return false;

    const cellDate = new Date(cellValue as string | number | Date).getTime();
    if (Number.isNaN(cellDate)) return false;

    if (from) {
        const fromDate = new Date(from).getTime();
        if (cellDate < fromDate) return false;
    }
    if (to) {
        const toDate = new Date(to).getTime() + 86_400_000 - 1;
        if (cellDate > toDate) return false;
    }
    return true;
};

export const booleanFilterFn: FilterFn<unknown> = (row, columnId, filterValue: boolean | undefined) => {
    if (filterValue === undefined) return true;
    return Boolean(row.getValue(columnId)) === filterValue;
};

export const searchFilterFn: FilterFn<unknown> = textFilterFn;

/**
 * Tags filter - the cell value is a separator-joined string of tags.
 * The filterValue is an array of selected tags; a row passes if it contains ALL selected tags.
 */
export const tagFilterFn: FilterFn<unknown> = (row, columnId, filterValue: string[]) => {
    if (!filterValue || filterValue.length === 0) return true;
    const cellValue = String(row.getValue(columnId) ?? '').toLowerCase();
    return filterValue.every((tag) => cellValue.toLowerCase().includes(tag.toLowerCase()));
};

/**
 * Object filter - works for object/array cell values.
 * Searches across object keys and nested values.
 *
 * Example:
 * {
 *   AZURE_API_KEY: 'xxx',
 *   AZURE_API_BASE: 'https://resource.openai.azure.com'
 * }
 *
 * Searching "AZURE_API_BASE", "openai", or "resource" will match.
 */
export const objectFilterFn: FilterFn<unknown> = (row, columnId, filterValue: string) => {
    if (!filterValue) return true;

    const cellValue = row.getValue(columnId);
    const searchableValue = stringifyObjectValue(cellValue).toLowerCase();
    const normalizedFilterValue = filterValue.toLowerCase().trim();

    return searchableValue.includes(normalizedFilterValue);
};

export const filterFnMap = {
    text: textFilterFn,
    select: selectFilterFn,
    'number-range': numberRangeFilterFn,
    'date-range': dateRangeFilterFn,
    boolean: booleanFilterFn,
    search: searchFilterFn,
    tags: tagFilterFn,
    object: objectFilterFn,
} as const;
