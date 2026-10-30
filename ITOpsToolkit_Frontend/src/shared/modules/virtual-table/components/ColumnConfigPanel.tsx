import { type FC, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';
import { Settings2, Eye, EyeOff, PanelLeft, PanelRight, PinOff, GripVertical, RotateCcw } from 'lucide-react';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { ColumnConfigPanelProps, ColumnMeta } from '../types';

const ColumnConfigPanel: FC<ColumnConfigPanelProps> = ({
    className,
    triggerClassName,
    childrenClassNames,
    settingsIconSize = 14,
    resetIconSize = 10,
    dragIconSize = 12,
    pinIconSize = 12,
    visibilityIconSize = 12,
}) => {
    const { table, classNames, maxPinnedColumns, columnPinning, initialColumnPinning, initialColumnVisibility, initialColumnOrder, initialSorting, initialColumnFilters } =
        useVirtualTableContext();
    const [isOpen, setIsOpen] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState({
        top: 0,
        left: 0,
        width: 288,
        maxListHeight: 288,
    });
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const margin = 8;
        const gap = 4;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fixedHeight = 80;
        const minListHeight = 80;
        const defaultMaxList = 288;
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

        setPanelPos({
            top,
            left,
            width,
            maxListHeight: Math.max(minListHeight, maxListHeight),
        });
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

    const allColumns = table.getAllLeafColumns();
    const columnOrder = table.getState().columnOrder ?? [];

    const displayColumns =
        columnOrder.length > 0
            ? [...(columnOrder.map((id) => allColumns.find((c) => c.id === id)).filter(Boolean) as typeof allColumns), ...allColumns.filter((c) => !columnOrder.includes(c.id))]
            : allColumns;

    const currentPinnedCount = (columnPinning.left?.length ?? 0) + (columnPinning.right?.length ?? 0);
    const pinLimitReached = currentPinnedCount >= maxPinnedColumns;

    const handleToggleVisibility = useCallback(
        (columnId: string) => {
            table.getColumn(columnId)?.toggleVisibility();
        },
        [table],
    );

    const handleTogglePin = useCallback(
        (columnId: string, position: 'left' | 'right') => {
            const column = table.getColumn(columnId);
            if (!column) return;
            const currentPin = column.getIsPinned();
            if (currentPin === position) {
                column.pin(false);
            } else {
                if (pinLimitReached && !currentPin) return;
                column.pin(position);
            }
        },
        [table, pinLimitReached],
    );

    const handleReset = useCallback(() => {
        table.setColumnOrder(initialColumnOrder);
        table.setColumnVisibility(initialColumnVisibility);
        table.setColumnPinning(initialColumnPinning);
        table.setSorting(initialSorting);
        table.setColumnFilters(initialColumnFilters);
        table.setGlobalFilter(undefined);
    }, [table, initialColumnOrder, initialColumnVisibility, initialColumnPinning, initialSorting, initialColumnFilters]);

    const handleShowAll = useCallback(() => {
        table.toggleAllColumnsVisible(true);
    }, [table]);

    const getColumnOrder = useCallback((): string[] => {
        const order = table.getState().columnOrder ?? [];
        return order.length > 0 ? [...order] : allColumns.map((c) => c.id);
    }, [table, allColumns]);

    const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
        setDraggedId(columnId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', columnId);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.4';
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedId(null);
        setDragOverId(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    }, []);

    const handleDragOver = useCallback(
        (e: React.DragEvent, columnId: string) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (columnId !== draggedId) {
                setDragOverId(columnId);
            }
        },
        [draggedId],
    );

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, targetId: string) => {
            e.preventDefault();
            setDragOverId(null);
            if (!draggedId || draggedId === targetId) return;

            const order = getColumnOrder();
            const fromIndex = order.indexOf(draggedId);
            const toIndex = order.indexOf(targetId);
            if (fromIndex === -1 || toIndex === -1) return;

            const newOrder = [...order];
            newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, draggedId);
            table.setColumnOrder(newOrder);
            setDraggedId(null);
        },
        [draggedId, getColumnOrder, table],
    );

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
                    classNames.columnConfigTrigger,
                    triggerClassName,
                )}
                title="Configure columns"
            >
                <Settings2 size={settingsIconSize} className={childrenClassNames?.triggerIcon} />

                <span className={childrenClassNames?.triggerLabel}>Columns</span>
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
                        className={twMerge('rounded-lg border border-gray-200 bg-white shadow-xl', classNames.columnConfigPanel, className)}
                    >
                        <div className={twMerge('flex items-center justify-between border-b border-gray-200 px-3 py-2', childrenClassNames?.header)}>
                            <span className={twMerge('text-xs font-semibold text-gray-700', childrenClassNames?.title)}>Column Settings</span>

                            <div className={twMerge('flex gap-1', childrenClassNames?.actions)}>
                                <button
                                    type="button"
                                    onClick={handleShowAll}
                                    className={twMerge('cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50', childrenClassNames?.showAllButton)}
                                >
                                    Show All
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className={twMerge(
                                        'flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100',
                                        childrenClassNames?.resetButton,
                                    )}
                                    title="Reset to defaults"
                                >
                                    <RotateCcw size={resetIconSize} className={childrenClassNames?.resetIcon} />
                                    Reset
                                </button>
                            </div>
                        </div>

                        {pinLimitReached && (
                            <div className={twMerge('border-b border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] text-amber-700', childrenClassNames?.warning)}>
                                Unpin other columns first to pin more max {maxPinnedColumns}.
                            </div>
                        )}

                        <div className={twMerge('overflow-y-auto', childrenClassNames?.list)} style={{ maxHeight: panelPos.maxListHeight }}>
                            {displayColumns.map((column) => {
                                const isVisible = column.getIsVisible();
                                const isPinned = column.getIsPinned();
                                const canColumnPin = column.getCanPin();
                                const canColumnHide = column.getCanHide();
                                const isDraggable = !isPinned;
                                const meta = column.columnDef.meta as ColumnMeta | undefined;
                                const headerValue = meta?.label ?? (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id);
                                const canPin = canColumnPin && (!pinLimitReached || !!isPinned);
                                const canHide = canColumnHide && !isPinned;

                                return (
                                    <div
                                        key={column.id}
                                        draggable={isDraggable}
                                        onDragStart={isDraggable ? (e) => handleDragStart(e, column.id) : undefined}
                                        onDragEnd={isDraggable ? handleDragEnd : undefined}
                                        onDragOver={(e) => handleDragOver(e, column.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, column.id)}
                                        className={twMerge(
                                            'flex items-center gap-1 border-b border-gray-50 px-2 py-1.5 last:border-b-0',
                                            !isVisible && 'opacity-50',
                                            isPinned && 'bg-blue-50/40',
                                            dragOverId === column.id && draggedId !== column.id && 'border-t-2 border-t-blue-400',
                                            draggedId === column.id && 'opacity-40',
                                            childrenClassNames?.row,
                                        )}
                                    >
                                        <GripVertical
                                            size={dragIconSize}
                                            className={twMerge(
                                                'shrink-0',
                                                isDraggable ? 'cursor-grab text-gray-400 active:cursor-grabbing' : 'text-gray-200',
                                                childrenClassNames?.dragIcon,
                                            )}
                                        />

                                        <span className={twMerge('min-w-0 flex-1 truncate text-xs text-gray-700', childrenClassNames?.columnLabel)}>
                                            {headerValue}

                                            {isPinned === 'left' && <span className={twMerge('ml-1 text-[9px] text-blue-500', childrenClassNames?.pinnedLabel)}>left</span>}

                                            {isPinned === 'right' && <span className={twMerge('ml-1 text-[9px] text-blue-500', childrenClassNames?.pinnedLabel)}>right</span>}
                                        </span>

                                        <div className={twMerge('flex shrink-0 items-center gap-0.5', childrenClassNames?.rowActions)}>
                                            {canColumnPin && (
                                                <>
                                                    {isPinned ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTogglePin(column.id, isPinned as 'left' | 'right')}
                                                            className={twMerge('cursor-pointer rounded p-0.5 text-blue-600 hover:bg-gray-100', childrenClassNames?.unpinButton)}
                                                            title="Unpin column"
                                                        >
                                                            <PinOff size={pinIconSize} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTogglePin(column.id, 'left')}
                                                                disabled={!canPin}
                                                                className={twMerge(
                                                                    'cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30',
                                                                    childrenClassNames?.pinButton,
                                                                )}
                                                                title={pinLimitReached ? 'Unpin other columns first' : 'Pin to left'}
                                                            >
                                                                <PanelLeft size={pinIconSize} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTogglePin(column.id, 'right')}
                                                                disabled={!canPin}
                                                                className={twMerge(
                                                                    'cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30',
                                                                    childrenClassNames?.pinButton,
                                                                )}
                                                                title={pinLimitReached ? 'Unpin other columns first' : 'Pin to right'}
                                                            >
                                                                <PanelRight size={pinIconSize} />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleToggleVisibility(column.id)}
                                                disabled={!canHide}
                                                className={twMerge(
                                                    'cursor-pointer rounded p-0.5 hover:bg-gray-100',
                                                    !canHide && 'cursor-not-allowed opacity-30',
                                                    canHide && isVisible && 'text-gray-500 hover:text-gray-700',
                                                    canHide && !isVisible && 'text-gray-300 hover:text-gray-500',
                                                    childrenClassNames?.visibilityButton,
                                                )}
                                                title={!canColumnHide ? 'Cannot hide this column' : isPinned ? 'Unpin to hide' : isVisible ? 'Hide column' : 'Show column'}
                                            >
                                                {isVisible ? <Eye size={visibilityIconSize} /> : <EyeOff size={visibilityIconSize} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={twMerge('border-t border-gray-200 px-3 py-1.5', childrenClassNames?.footer)}>
                            <p className={twMerge('text-[10px] text-gray-400', childrenClassNames?.footerText)}>
                                {table.getVisibleLeafColumns().length} of {allColumns.length} visible &middot; {currentPinnedCount} pinned &middot;{' '}
                                {table.getRowModel().rows.length.toLocaleString()} rows
                            </p>
                        </div>
                    </div>,
                    getPortalContainer(),
                )}
        </>
    );
};

ColumnConfigPanel.displayName = 'VirtualTable.ColumnConfigPanel';
export default ColumnConfigPanel;
