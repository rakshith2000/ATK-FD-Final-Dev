import { memo, useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import RecentKBArticleCard from '../../ui/RecentKBArticleCard/RecentKBArticleCard';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { fetchRecentUserReadableKnowledgeArticles } from '@/shared/modules/servicenow/services/fetch-user-readable-knowledge-data';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';

const RecentKBArticlesList: React.FC = memo(() => {
    const recentKbsQuery = useQuery({
        queryKey: ['recent-knowledge-articles'],
        queryFn: () => fetchRecentUserReadableKnowledgeArticles(10),
    });

    const parentRef = useRef<HTMLDivElement>(null);
    const [selectedKBSysId, setSelectedKBSysId] = useState<string | null>(null);

    const items = recentKbsQuery.data ?? [];

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100,
        overscan: 5,
        getItemKey: (index) => items[index]?.sys_id?.value ?? index,
    });

    const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const card = (event.target as HTMLElement).closest('[data-kb-number]');
        const kbNumber = card?.getAttribute('data-kb-number');
        if (!kbNumber) return;

        setSelectedKBSysId((prev) => (prev === kbNumber ? null : kbNumber));
    }, []);

    if (recentKbsQuery.isLoading) return <ListSkeleton rows={10} className="p-2" />;
    if (recentKbsQuery?.isError)
        return <ErrorPlaceholder error={recentKbsQuery.error} iconSize={100} onRetry={() => recentKbsQuery.refetch()} isRefetching={recentKbsQuery.isRefetching} />;
    if (!items.length) return <EmptyPlaceholder message="No recent KB articles found" onRetry={() => recentKbsQuery.refetch()} isRefetching={recentKbsQuery.isRefetching} />;

    return (
        <div ref={parentRef} className="h-full overflow-y-auto relative brand-box-show-inset" onClick={handleClick}>
            <h1 className="p-2 w-full sticky top-0 rounded-md text-xs backdrop-blur-3xl z-10 text-(--brand-header-title-color) font-bold flex justify-between items-center">
                <TitleWithArraow title="Recent SOP Generated" className="p-0 m-0" />
                <RefetchButton iconSize={16} isRefetching={recentKbsQuery?.isRefetching} onRefetch={recentKbsQuery?.refetch} />
            </h1>
            <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const kb = items[virtualItem.index];
                    return (
                        <div
                            key={virtualItem.key}
                            ref={virtualizer.measureElement}
                            data-index={virtualItem.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <RecentKBArticleCard kb={kb} isSelected={kb.sys_id?.value === selectedKBSysId} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

RecentKBArticlesList.displayName = 'RecentKBsList';
export default RecentKBArticlesList;
