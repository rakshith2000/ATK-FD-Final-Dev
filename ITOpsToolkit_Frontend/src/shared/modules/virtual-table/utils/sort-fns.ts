import type { Row, RowData } from '@tanstack/react-table';

// --- Date Sort (date-only strings like "2025-03-15" or "03/15/2025") --------

export function dateSortFn<TData extends RowData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
    const a = rowA.getValue<string>(columnId);
    const b = rowB.getValue<string>(columnId);

    const ta = a ? new Date(a).getTime() : 0;
    const tb = b ? new Date(b).getTime() : 0;

    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;

    return ta - tb;
}

// --- DateTime Sort (full timestamps like "2025-03-15 14:30:00" or ISO) ------

export function dateTimeSortFn<TData extends RowData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
    const a = rowA.getValue<string>(columnId);
    const b = rowB.getValue<string>(columnId);

    const ta = a ? new Date(a).getTime() : 0;
    const tb = b ? new Date(b).getTime() : 0;

    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;

    return ta - tb;
}

// --- Numeric Sort (handles string-encoded numbers, e.g. "42", "3.14") -------

export function numericSortFn<TData extends RowData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
    const a = Number(rowA.getValue(columnId));
    const b = Number(rowB.getValue(columnId));

    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;

    return a - b;
}

// --- Boolean Sort (true first) ----------------------------------------------

export function booleanSortFn<TData extends RowData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
    const a = rowA.getValue(columnId);
    const b = rowB.getValue(columnId);
    return a === b ? 0 : a ? -1 : 1;
}

// --- Case-Insensitive Alphabetical Sort -------------------------------------

export function alphanumericInsensitiveSortFn<TData extends RowData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
    const a = String(rowA.getValue(columnId) ?? '').toLowerCase();
    const b = String(rowB.getValue(columnId) ?? '').toLowerCase();
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// --- Priority / Severity Sort (extracts leading number: "1 - Critical" -> 1) -

export function prioritySortFn<TData extends RowData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
    const extract = (val: unknown): number => {
        const match = String(val ?? '').match(/^(\d+)/);
        return match ? Number(match[1]) : Infinity;
    };
    return extract(rowA.getValue(columnId)) - extract(rowB.getValue(columnId));
}

// --- Map for declarative usage via meta.sortType ----------------------------
