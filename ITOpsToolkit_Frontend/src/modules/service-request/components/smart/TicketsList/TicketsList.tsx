import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import { Activity, memo, useCallback, useEffect, useRef } from 'react';
import TicketMetaDetailsCard from '../../ui/TicketMetaDetailsCard/TicketMetaDetailsCard';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

export interface TicketsListProps {
    ticketList: Array<SnowTicket>;
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
    selectState?: string | null;
    selectedPriority?: string | null;
    renderForm?: (ticket: SnowTicket) => React.ReactNode;
}

const TicketsList: React.FC<TicketsListProps> = memo(
    ({
        ticketList,
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

        const ticketCount = ticketList.length;

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

        // Infinite scroll: fetch next page when the user scrolls near the bottom.
        // Paused while a client-side state / priority filter is active, since those
        // filter only the already-loaded pages.
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
        }, [lastVirtualItemIndex, ticketCount, hasNextPage, isFetchingNextPage, fetchNextPage, selectState, selectedPriority]);

        // Scroll to the selected ticket when it changes
        useEffect(() => {
            if (!selectedTicketId || showTicketUpdateForm || selectedTicketIndex < 0) return;
            const timer = setTimeout(() => {
                virtualizer.scrollToIndex(selectedTicketIndex, { align: 'auto', behavior: 'smooth' });
            }, 100);
            return () => clearTimeout(timer);
        }, [selectedTicketId, showTicketUpdateForm, selectedTicketIndex]);

        // Event-delegation click handler - one listener for the entire list
        // instead of per-card, avoids many event listener allocations.
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
        if (!ticketCount) return <EmptyPlaceholder onRetry={refetch} isRefetching={isRefetching} message="No tickets found" />;

        const isFormVisible = !!selectedTicketId && showTicketUpdateForm;

        return (
            <>
                <Activity name="Tickets-list" mode={isFormVisible ? 'hidden' : 'visible'}>
                    <div className="flex flex-col h-full w-full relative">
                        <div ref={parentRef} className="overflow-y-auto flex-1 w-full relative" onClick={handleTicketClick}>
                            <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                                {virtualItems.map((virtualItem) => {
                                    const ticket = ticketList[virtualItem.index];
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
                                            <TicketMetaDetailsCard
                                                ticketId={ticket?.sys_id}
                                                ticketNumber={ticket?.number}
                                                assignedTo={ticket?.assigned_to}
                                                assignmentGroup={ticket?.assignment_group}
                                                priority={ticket?.priority}
                                                state={ticket?.request_state}
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
                                Loading more tickets...
                            </div>
                        )}
                    </div>
                </Activity>

                {isFormVisible && selectedTicket ? renderForm?.(selectedTicket) : null}
            </>
        );
    },
);

export default TicketsList;
