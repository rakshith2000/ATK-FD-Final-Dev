import { type FC, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';
import { ArrowUpDown, ArrowUp, ArrowDown, X, Trash2 } from 'lucide-react';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { SortConfigPanelProps, ColumnMeta } from '../types';

const SortConfig: FC<SortConfigPanelProps> = ({ className, triggerClassName }) => {
    const { table, classNames, sorting } = useVirtualTableContext();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 288, maxListHeight: 256 });

    // Hide when sorting is disabled
    if (table.options.enableSorting === false) return null;

    //  Positioning (portal-based)
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

    const sortableColumns = table.getAllLeafColumns().filter((col) => col.getCanSort());
    const activeSort = sorting[0] ?? null;
    const unsortedColumns = sortableColumns.filter((col) => col.id !== activeSort?.id);

    //  Handlers
    const handleToggleDirection = useCallback(() => {
        if (!activeSort) return;
        table.setSorting([{ ...activeSort, desc: !activeSort.desc }]);
    }, [table, activeSort]);

    const handleClear = useCallback(() => {
        table.resetSorting();
    }, [table]);

    const handleSetSort = useCallback(
        (columnId: string) => {
            table.setSorting([{ id: columnId, desc: false }]);
        },
        [table],
    );

    const getColumnLabel = (columnId: string): string => {
        const column = table.getColumn(columnId);
        if (!column) return columnId;
        const meta = column.columnDef.meta as ColumnMeta | undefined;
        return meta?.label ?? (typeof column.columnDef.header === 'string' ? column.columnDef.header : columnId);
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
                    activeSort && 'border-blue-300 bg-blue-50 text-blue-700',
                    classNames.sortConfigTrigger,
                    triggerClassName,
                )}
                title="Manage sorting"
            >
                <ArrowUpDown size={14} />
                Sort
                {activeSort && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">1</span>}
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
                        className={twMerge('rounded-lg border border-gray-200 bg-white shadow-xl', classNames.sortConfigPanel, className)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                            <span className="text-xs font-semibold text-gray-700">Sort Settings</span>
                            {activeSort && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 size={10} />
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto" style={{ maxHeight: panelPos.maxListHeight }}>
                            {/* Active sort */}
                            {activeSort && (
                                <div className="border-b border-gray-100">
                                    <div className="px-3 py-1">
                                        <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Active</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-blue-50/50 px-3 py-1.5">
                                        <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{getColumnLabel(activeSort.id)}</span>

                                        <div className="flex shrink-0 overflow-hidden rounded border border-gray-200 text-[10px] font-medium">
                                            <button
                                                type="button"
                                                onClick={() => !activeSort.desc || handleToggleDirection()}
                                                className={twMerge(
                                                    'flex cursor-pointer items-center gap-0.5 px-1.5 py-0.5',
                                                    !activeSort.desc ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50',
                                                )}
                                            >
                                                <ArrowUp size={10} /> ASC
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => activeSort.desc || handleToggleDirection()}
                                                className={twMerge(
                                                    'flex cursor-pointer items-center gap-0.5 px-1.5 py-0.5',
                                                    activeSort.desc ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50',
                                                )}
                                            >
                                                <ArrowDown size={10} /> DESC
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleClear}
                                            className="shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                            title="Remove sort"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Available columns */}
                            {unsortedColumns.length > 0 && (
                                <div>
                                    <div className="px-3 py-1">
                                        <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{activeSort ? 'Switch to' : 'Sort by'}</span>
                                    </div>
                                    {unsortedColumns.map((column) => {
                                        const meta = column.columnDef.meta as ColumnMeta | undefined;
                                        const label = meta?.label ?? (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id);
                                        return (
                                            <div key={column.id} className="flex items-center gap-2 border-b border-gray-50 px-3 py-1.5 last:border-b-0">
                                                <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{label}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetSort(column.id)}
                                                    className="shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                                                    title={`Sort by ${label}`}
                                                >
                                                    <ArrowUpDown size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {sortableColumns.length === 0 && <div className="px-3 py-4 text-center text-xs text-gray-400">No sortable columns</div>}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 px-3 py-1.5">
                            <p className="text-[10px] text-gray-400">
                                {activeSort ? `Sorted by ${getColumnLabel(activeSort.id)} (${activeSort.desc ? 'desc' : 'asc'})` : 'No active sort'}
                            </p>
                        </div>
                    </div>,
                    getPortalContainer(),
                )}
        </>
    );
};

SortConfig.displayName = 'VirtualTable.SortConfig';
export default SortConfig;
