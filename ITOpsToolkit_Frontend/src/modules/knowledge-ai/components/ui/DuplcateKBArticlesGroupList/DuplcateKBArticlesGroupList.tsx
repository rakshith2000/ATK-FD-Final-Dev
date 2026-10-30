import type { CategoryWiseDuplicateCatalog, DuplicateGroup } from '@/modules/knowledge-ai/types';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import useResponsiveScreenSize from '@/shared/hooks/useResponsiveScreenSize';
import { useVirtualizer } from '@tanstack/react-virtual';
import type React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import DuplcateKBArticlesGroupCard from '../DuplcateKBArticlesGroupCard/DuplcateKBArticlesGroupCard';
import logger from '@/shared/utils/logger';

interface DuplcateKBArticlesGroupListProps {
    categoryWiseDuplicateCatalog: CategoryWiseDuplicateCatalog[];
    onSelect: (group: DuplicateGroup) => void;
    isLoading?: boolean;
    isError?: boolean;
    isRefetching?: boolean;
    error: Error | null;
    onRefetch?: () => void;
    loadingTitle?: string;
    errorTitle?: string;
    noDataTitle?: string;
    columns?: number;
}

const DuplcateKBArticlesGroupList: React.FC<DuplcateKBArticlesGroupListProps> = ({
    categoryWiseDuplicateCatalog,
    onSelect,
    error,
    isError,
    isLoading,
    onRefetch,
    errorTitle,
    noDataTitle,
    isRefetching,
    columns: originalCols = 2,
}) => {
    const { lt: screenSizeLessThen, gt: screenSizeGreaterThen } = useResponsiveScreenSize();
    const parentRef = useRef<HTMLDivElement>(null);

    const duplicateGroups: DuplicateGroup[] = useMemo(
        () =>
            categoryWiseDuplicateCatalog?.reduce((acc: Array<DuplicateGroup>, catalog) => {
                logger.debug({ catalog, acc });
                return [...acc, ...catalog.duplicateGroups];
            }, []),
        [categoryWiseDuplicateCatalog],
    );

    const columns = useMemo(() => {
        if (screenSizeLessThen('md')) return 1;
        if (screenSizeGreaterThen('4xl')) return 4;
        if (screenSizeGreaterThen('lg')) return 3;
        if (screenSizeGreaterThen('md')) return 2;
        return originalCols;
    }, [screenSizeLessThen, screenSizeGreaterThen, originalCols]);

    const rows = useMemo(
        () => Array.from({ length: Math.ceil(duplicateGroups.length / columns) }, (_, i) => duplicateGroups.slice(i * columns, i * columns + columns)),
        [duplicateGroups, columns],
    );

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 280,
        overscan: 5,
        getItemKey: (index) => JSON.stringify(rows[index][0]?.kbNumbers) ?? index,
    });

    const rowContent = useCallback(
        (row: DuplicateGroup[], rowIndex: number) => (
            <div key={rowIndex} className="flex gap-3 pb-3">
                {row.map((group) => (
                    <div key={JSON.stringify(group.kbNumbers)} className="flex cursor-pointer" style={{ width: `calc((100% - (${columns} - 1) * 0.75rem) / ${columns})` }}>
                        <DuplcateKBArticlesGroupCard group={group} id={JSON.stringify(group.kbNumbers)} onClick={onSelect} />
                    </div>
                ))}
                {/* Fill remaining slots in last row so cards don't stretch */}
                {row.length < columns &&
                    Array.from({ length: columns - row.length }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ width: `calc((100% - (${columns} - 1) * 0.75rem) / ${columns})` }} />
                    ))}
            </div>
        ),
        [columns, onSelect],
    );

    if (isLoading) return <GridSkeleton rows={3} cols={3} className="p-2" />;
    if (isError) return <ErrorPlaceholder title={errorTitle} iconSize={100} error={error} onRetry={() => onRefetch?.()} isRefetching={isRefetching} />;
    if (!duplicateGroups?.length) return <EmptyPlaceholder iconSize={100} isRefetching={isRefetching} message={noDataTitle ?? 'No articles found'} />;

    return (
        <div ref={parentRef} className="overflow-y-auto h-full p-3">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => (
                    <div
                        key={virtualRow.key}
                        ref={virtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                    >
                        {rowContent(rows[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DuplcateKBArticlesGroupList;
