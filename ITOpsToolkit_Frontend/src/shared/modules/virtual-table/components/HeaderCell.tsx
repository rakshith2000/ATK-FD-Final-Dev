import type { RowData } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { twMerge } from 'tailwind-merge';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { HeaderCellProps } from '../types';

const PINNED_HEADER_Z = 30;

function HeaderCell<TData extends RowData>({ header, className }: HeaderCellProps<TData>) {
    const { classNames, columnPinning } = useVirtualTableContext<TData>();
    const canSort = header.column.getCanSort();
    const sorted = header.column.getIsSorted();

    const SortedIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : null;

    const isPinnedLeft = header.column.getIsPinned() === 'left';
    const isSorted = header.column.getIsSorted();
    const isPinnedRight = header.column.getIsPinned() === 'right';
    const isPinned = isPinnedLeft || isPinnedRight;
    const isLastLeft = isPinnedLeft && columnPinning.left?.[columnPinning.left.length - 1] === header.column.id;
    const isFirstRight = isPinnedRight && columnPinning.right?.[0] === header.column.id;

    return (
        <th
            key={header.id}
            colSpan={header.colSpan}
            style={{
                width: header.getSize(),
                minWidth: header.column.columnDef.minSize ?? 60,
                maxWidth: header.column.columnDef.maxSize,
                position: isPinned ? 'sticky' : 'relative',
                left: isPinnedLeft ? `${header.column.getStart('left')}px` : undefined,
                right: isPinnedRight ? `${header.column.getAfter('right')}px` : undefined,
                zIndex: isPinned ? PINNED_HEADER_Z : undefined,
            }}
            className={twMerge(
                'group select-none whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-700',
                isPinned && 'bg-gray-100',
                isLastLeft && 'border-r border-r-blue-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                isFirstRight && 'border-l border-l-blue-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                classNames.theadCell,
                className,
            )}
        >
            <div className="flex items-center gap-1">
                {header.isPlaceholder ? null : (
                    <>
                        <span className={twMerge('flex-1 truncate', canSort && 'cursor-pointer')} onClick={canSort ? header.column.getToggleSortingHandler() : undefined}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {canSort && isSorted && (
                            <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className={twMerge('shrink-0 cursor-pointer', sorted ? 'text-blue-600' : 'text-gray-400', classNames.sortIcon)}
                            >
                                {SortedIcon && <SortedIcon size={12} />}
                            </button>
                        )}
                        {canSort && !isSorted && (
                            <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className={twMerge('invisible group-hover:visible shrink-0 cursor-pointer', sorted ? 'text-blue-600' : 'text-gray-400', classNames.sortIcon)}
                            >
                                <ArrowUpDown size={12} />
                            </button>
                        )}
                    </>
                )}

                {header.column.getCanResize() && (
                    <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={twMerge(
                            'absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-blue-400',
                            header.column.getIsResizing() && 'bg-blue-500',
                            classNames.resizeHandle,
                        )}
                    />
                )}
            </div>
        </th>
    );
}

HeaderCell.displayName = 'VirtualTable.HeaderCell';
export default HeaderCell;
