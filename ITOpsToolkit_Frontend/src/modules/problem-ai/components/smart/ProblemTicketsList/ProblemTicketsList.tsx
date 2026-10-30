import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import { Activity, memo, useCallback, useEffect, useRef } from 'react';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import ProblemTicketMetaDetailsCard from '../../ui/ProblemTicketMetaDetailsCard/ProblemTicketMetaDetailsCard';

const ProblemTicketsList: React.FC<{
    filteredTickets: Array<SnowTicket>;
    isLoading: boolean;
    isError: boolean;
    error?: Error | null;
    isRefetching: boolean;
    refetch: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    selectedTicket: SnowTicket | undefined;
    selectedTicketIndex: number;
    onSelect: (ticketId: string) => void;
    onUnSelect?: (ticketId: string) => void;
    selectedTicketId: string | null;
    showTicketUpdateForm: boolean;
    selectedPriority: string | null;
    selectState?: string | null;
    renderForm?: (ticket: SnowTicket) => React.ReactNode;
}> = memo(
    ({
        filteredTickets,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        isRefetching,
        refetch,
        error,
        selectedTicket,
        selectedTicketIndex,
        onSelect,
        onUnSelect,
        selectedTicketId,
        showTicketUpdateForm,
        renderForm,
        selectState,
        selectedPriority,
    }) => {
        const parentRef = useRef<HTMLDivElement>(null);

        const ticketCount = filteredTickets.length;

        const virtualizer = useVirtualizer({
            count: ticketCount,
            getScrollElement: () => parentRef.current,
            estimateSize: () => 110,
            overscan: 3,
        });

        const virtualItems = virtualizer.getVirtualItems();
        const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const lastVirtualItemIndex = virtualItems[virtualItems.length - 1]?.index;

        useEffect(() => {
            if (parentRef.current) {
                parentRef.current.scrollTop = 0;
            }
        }, [isLoading]);

        // Infinite scroll: fetch next page when the user scrolls near the bottom
        useEffect(() => {
            if (lastVirtualItemIndex === undefined || !hasNextPage || isFetchingNextPage || !fetchNextPage || selectState || selectedPriority) return;

            if (lastVirtualItemIndex >= ticketCount - 3) {
                if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
                debounceTimeoutRef.current = setTimeout(() => {
                    fetchNextPage();
                }, 200);
            }

            return () => {
                if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            };
        }, [lastVirtualItemIndex, ticketCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

        // Scroll to the selected incident when it changes
        useEffect(() => {
            if (!selectedTicketId || showTicketUpdateForm || selectedTicketIndex < 0) return;
            const timer = setTimeout(() => {
                virtualizer.scrollToIndex(selectedTicketIndex, { align: 'auto', behavior: 'smooth' });
            }, 100);
            return () => clearTimeout(timer);
        }, [selectedTicketId, showTicketUpdateForm, selectedTicketIndex]);

        // Event-delegation click handler - one listener for the entire list
        // instead of per-card, avoids 800 event listener allocations.
        const handleTicketClick = useCallback(
            (event: React.MouseEvent<HTMLDivElement>) => {
                const card = (event.target as HTMLElement).closest('[data-ticket-id]');
                const ticketId = card?.getAttribute('data-ticket-id');
                if (!ticketId) return;
                if (ticketId === selectedTicketId) {
                    onUnSelect?.(ticketId);
                } else {
                    onSelect?.(ticketId);
                }
            },
            [selectedTicketId, onUnSelect, onSelect],
        );

        if (isLoading) return <ListSkeleton rows={20} className="p-2" />;
        if (isError) return <ErrorPlaceholder error={error} onRetry={refetch} isRefetching={isRefetching} />;
        if (!ticketCount) return <EmptyPlaceholder onRetry={refetch} isRefetching={isRefetching} message="No problems tickets found" />;
        const isFormVisible = !!selectedTicketId && showTicketUpdateForm;

        return (
            <>
                <Activity name="problem-list" mode={isFormVisible ? 'hidden' : 'visible'}>
                    <div ref={parentRef} className="overflow-y-auto h-full" onClick={handleTicketClick}>
                        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                            {virtualizer.getVirtualItems().map((virtualItem) => {
                                const ticket = filteredTickets[virtualItem.index];
                                if (!ticket) return null;
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
                                        <ProblemTicketMetaDetailsCard
                                            ticketId={ticket?.sys_id}
                                            ticketNumber={ticket?.number}
                                            related_incidents={ticket?.related_incidents}
                                            assignedTo={ticket?.assigned_to}
                                            assignmentGroup={ticket?.assignment_group}
                                            priority={ticket?.priority}
                                            state={ticket?.state}
                                            shortDescription={ticket?.short_description}
                                            isSelected={ticket?.sys_id?.value === selectedTicketId}
                                            config={{ disableTooltip: true }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {isFetchingNextPage && (
                        <div className="p-3 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-200 shadow-sm shrink-0 z-10 animate-pulse">
                            Loading more problem tickets...
                        </div>
                    )}
                </Activity>

                {isFormVisible && selectedTicket ? renderForm?.(selectedTicket) : null}
            </>
        );
    },
);

export default ProblemTicketsList;
