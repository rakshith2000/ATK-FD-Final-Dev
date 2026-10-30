import { type FC, useCallback, useTransition } from 'react';
import { twMerge } from 'tailwind-merge';
import { Download } from 'lucide-react';
import type { Column, Table } from '@tanstack/react-table';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { ExportDataProps, ColumnMeta } from '../types';
import { sleep } from '@/shared/utils/sleep';

const INTERNAL_COLUMN_IDS = new Set(['__selection__', '__expander__']);
const ROWS_PER_CHUNK = 500;
/** Cells starting with these characters are treated as formulas by Excel/Sheets (CSV injection). */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Resolves after the browser has painted, so pending UI is visible before heavy work starts. */
const waitForPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** Yields control back to the main thread between chunks of work. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const toError = (err: unknown) => (err instanceof Error ? err : new Error(String(err)));

/** RFC 4180 – escape a cell value for CSV. */
function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '';

    let str = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);

    // Neutralise spreadsheet formulas in user-provided strings
    if (typeof value === 'string' && FORMULA_PREFIX.test(str)) str = `'${str}`;

    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function getColumnLabel<TData>(column: Column<TData, unknown>): string {
    const meta = column.columnDef.meta as ColumnMeta | undefined;
    return meta?.label ?? (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id);
}

/**
 * Serialises the table to CSV.
 * Respects column visibility/order, filtering and sorting (ignores pagination),
 * and skips internal columns. Yields between chunks to keep the UI responsive.
 */
async function buildCsv<TData>(table: Table<TData>): Promise<string> {
    const columns = table.getVisibleLeafColumns().filter((col) => !INTERNAL_COLUMN_IDS.has(col.id));
    const rows = table.getPrePaginationRowModel().rows;

    const lines: string[] = [columns.map((col) => escapeCsvCell(getColumnLabel(col))).join(',')];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        lines.push(columns.map((col) => escapeCsvCell(row.getValue(col.id))).join(','));
        if ((i + 1) % ROWS_PER_CHUNK === 0) await yieldToMain();
    }

    return lines.join('\r\n');
}

function downloadCsv(csv: string, filename: string) {
    // BOM so Excel detects UTF-8
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoking synchronously can cancel the download in Firefox/Safari
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ExportData: FC<ExportDataProps> = ({
    filename = 'table-export',
    label = 'Export Data',
    className,
    triggerClassName,
    childrenClassNames,
    triggerIconSize = 14,
    onExportStart,
    onExportComplete,
    onExportError,
}) => {
    const { table, classNames } = useVirtualTableContext();
    const [isPending, startTransition] = useTransition();

    const handleExport = useCallback(() => {
        if (isPending) return;

        startTransition(async () => {
            onExportStart?.();
            try {
                await sleep(1000);
                await waitForPaint(); // let the spinner render first
                const csv = await buildCsv(table);
                downloadCsv(csv, filename);
                onExportComplete?.();
            } catch (err) {
                onExportError?.(toError(err));
            }
        });
    }, [isPending, table, filename, onExportStart, onExportComplete, onExportError]);

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            aria-busy={isPending}
            aria-label={label}
            title={label}
            className={twMerge(
                'flex cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600',
                'hover:border-gray-400 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
                classNames.exportDataTrigger,
                triggerClassName,
                className,
            )}
        >
            {isPending ? (
                <span aria-hidden="true" className={twMerge('h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600', childrenClassNames?.spinner)} />
            ) : (
                <Download size={triggerIconSize} aria-hidden="true" className={childrenClassNames?.triggerIcon} />
            )}
            <span className={childrenClassNames?.triggerLabel}>{label}</span>
        </button>
    );
};

ExportData.displayName = 'VirtualTable.ExportData';
export default ExportData;
