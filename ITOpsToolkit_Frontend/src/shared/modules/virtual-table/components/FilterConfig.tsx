import { type FC, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';
import { SlidersHorizontal, X, Eye, EyeOff, Trash2, Search } from 'lucide-react';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { FilterConfigPanelProps, ColumnMeta } from '../types';

const FilterConfig: FC<FilterConfigPanelProps> = ({ className, triggerClassName }) => {
    const { table, classNames, filtersVisible, setFiltersVisible, columnFilters, globalFilter } = useVirtualTableContext();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 288, maxListHeight: 256 });

    //  Positioning (portal-based, escapes overflow clipping)
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const margin = 8;
        const gap = 4;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fixedHeight = 80;
        const minListHeight = 80;
        const defaultMaxList = 256;
        const preferredWidth = 288;

        const width = Math.min(preferredWidth, vw - margin * 2);

        let left = rect.right - width;
        left = Math.max(margin, Math.min(left, vw - width - margin));

        const spaceBelow = vh - rect.bottom - gap - margin;
        const spaceAbove = rect.top - gap - margin;

        let top: number;
        let maxListHeight: number;

        if (spaceBelow >= minListHeight + fixedHeight || spaceBelow >= spaceAbove) {
            top = rect.bottom + gap;
            maxListHeight = Math.min(defaultMaxList, spaceBelow - fixedHeight);
        } else {
            maxListHeight = Math.min(defaultMaxList, spaceAbove - fixedHeight);
            const panelHeight = Math.max(minListHeight, maxListHeight) + fixedHeight;
            top = rect.top - gap - panelHeight;
        }

        setPanelPos({ top, left, width, maxListHeight: Math.max(minListHeight, maxListHeight) });
    }, []);

    const closePanel = useCallback(() => setIsOpen(false), []);
    useClickOutside([triggerRef, panelRef], closePanel);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    const columnFilteringEnabled = table.options.enableColumnFilters !== false;
    const globalFilterEnabled = table.options.enableGlobalFilter !== false;

    const filterableColumns = table.getAllLeafColumns().filter((col) => {
        const meta = col.columnDef.meta as ColumnMeta | undefined;
        return meta?.filterType && col.getCanFilter();
    });

    const activeFilterCount = columnFilters.length + (globalFilter ? 1 : 0);

    // Hide entirely when both filtering and global filter are disabled
    if (!columnFilteringEnabled && !globalFilterEnabled) return null;

    const handleClearFilter = useCallback(
        (columnId: string) => {
            const column = table.getColumn(columnId);
            column?.setFilterValue(undefined);
        },
        [table],
    );

    const handleClearAll = useCallback(() => {
        table.resetColumnFilters();
        table.setGlobalFilter(undefined);
    }, [table]);

    const getFilterDisplayValue = (columnId: string): string => {
        const filter = columnFilters.find((f) => f.id === columnId);
        if (!filter) return '';
        const val = filter.value;
        if (Array.isArray(val)) {
            if (val.length === 2 && (val[0] === undefined || val[1] === undefined || typeof val[0] === 'number' || typeof val[0] === 'string')) {
                const [a, b] = val;
                if (a !== undefined && b !== undefined) return `${a} – ${b}`;
                if (a !== undefined) return `≥ ${a}`;
                if (b !== undefined) return `≤ ${b}`;
            }
            return val.join(', ');
        }
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val ?? '');
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                    if (!isOpen) updatePosition();
                    setIsOpen(!isOpen);
                }}
                className={twMerge(
                    'flex cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600',
                    'hover:border-gray-400 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    activeFilterCount > 0 && 'border-blue-300 bg-blue-50 text-blue-700',
                    classNames.filterConfigTrigger,
                    triggerClassName,
                )}
                title="Manage filters"
            >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{activeFilterCount}</span>
                )}
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            top: panelPos.top,
                            left: panelPos.left,
                            width: panelPos.width,
                            zIndex: 9999,
                        }}
                        className={twMerge('rounded-lg border border-gray-200 bg-white shadow-xl', classNames.filterConfigPanel, className)}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                            <span className="text-xs font-semibold text-gray-700">Filter Settings</span>
                            <div className="flex gap-1">
                                {columnFilteringEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => setFiltersVisible((v) => !v)}
                                        className="flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100"
                                    >
                                        {filtersVisible ? <EyeOff size={10} /> : <Eye size={10} />}
                                        {filtersVisible ? 'Hide Row' : 'Show Row'}
                                    </button>
                                )}
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearAll}
                                        className="flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 size={10} />
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto" style={{ maxHeight: panelPos.maxListHeight }}>
                            {/* Global search entry */}
                            {table.options.enableGlobalFilter !== false && (
                                <div className={twMerge('flex items-center gap-2 border-b border-gray-100 px-3 py-1.5', globalFilter && 'bg-blue-50/50')}>
                                    <Search size={12} className="shrink-0 text-gray-400" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className="truncate text-xs font-medium text-gray-700">Global Search</span>
                                            <span className="shrink-0 rounded bg-gray-100 px-1 text-[9px] text-gray-400">search</span>
                                        </div>
                                        {globalFilter && <p className="mt-0.5 truncate text-[10px] text-blue-600">&quot;{globalFilter}&quot;</p>}
                                    </div>
                                    {globalFilter && (
                                        <button
                                            type="button"
                                            onClick={() => table.setGlobalFilter(undefined)}
                                            className="shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                            title="Clear global search"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Column filters */}
                            {filterableColumns.length === 0 && !globalFilter ? (
                                <div className="px-3 py-4 text-center text-xs text-gray-400">No filterable columns</div>
                            ) : (
                                filterableColumns.map((column) => {
                                    const headerValue = typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;
                                    const meta = column.columnDef.meta as ColumnMeta;
                                    const hasActiveFilter = columnFilters.some((f) => f.id === column.id);
                                    const displayValue = getFilterDisplayValue(column.id);

                                    return (
                                        <div
                                            key={column.id}
                                            className={twMerge('flex items-center gap-2 border-b border-gray-50 px-3 py-1.5 last:border-b-0', hasActiveFilter && 'bg-blue-50/50')}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="truncate text-xs text-gray-700">{headerValue}</span>
                                                    <span className="shrink-0 rounded bg-gray-100 px-1 text-[9px] text-gray-400">{meta.filterType}</span>
                                                </div>
                                                {hasActiveFilter && displayValue && <p className="mt-0.5 truncate text-[10px] text-blue-600">{displayValue}</p>}
                                            </div>

                                            {hasActiveFilter && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleClearFilter(column.id)}
                                                    className="shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                    title={`Clear ${headerValue} filter`}
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="border-t border-gray-200 px-3 py-1.5">
                            <p className="text-[10px] text-gray-400">
                                {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                                {columnFilteringEnabled && <> &middot; Filter row {filtersVisible ? 'visible' : 'hidden'}</>}
                            </p>
                        </div>
                    </div>,
                    getPortalContainer(),
                )}
        </>
    );
};

FilterConfig.displayName = 'VirtualTable.FilterConfig';
export default FilterConfig;
