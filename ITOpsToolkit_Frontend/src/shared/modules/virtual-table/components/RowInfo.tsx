import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { ClassNameValue } from 'tailwind-merge';

interface RowInfoProps {
    className?: ClassNameValue;
    rowsAlias?: string;
}

const RowInfo: FC<RowInfoProps> = ({ className, rowsAlias }) => {
    const { table, rowSelection } = useVirtualTableContext();

    const totalRows = table.getCoreRowModel().rows.length;
    const filteredRows = table.getRowModel().rows.length;
    const selectedCount = Object.values(rowSelection).filter(Boolean).length;
    const isFiltered = filteredRows !== totalRows;

    return (
        <div className={twMerge('flex items-center gap-1.5 text-[11px] text-gray-500', className)}>
            {selectedCount > 0 && (
                <>
                    <span className="font-medium">{selectedCount} selected</span>
                    <span className="text-gray-300">|</span>
                </>
            )}
            <span className="truncate">
                {isFiltered ? (
                    <>
                        <span className="font-medium">{filteredRows.toLocaleString()}</span>
                        {' of '}
                        <span>{totalRows.toLocaleString()}</span>
                        {rowsAlias ?? ' rows'}
                    </>
                ) : (
                    <>
                        <span className="font-medium">{totalRows.toLocaleString()}</span>
                        {rowsAlias ?? ' rows'}
                    </>
                )}
            </span>
        </div>
    );
};

RowInfo.displayName = 'VirtualTable.RowInfo';
export default RowInfo;
