import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import { Activity, memo, useCallback, useEffect, useRef } from 'react';
import IncidentMetaDetailsCard from '../IncidentMetaDetailsCard/IncidentMetaDetailsCard';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
export interface IncidentsListProps {
    incidentList: Array<SnowTicket>;
    isLoading: boolean;
    isError: boolean;
    error?: Error | null;
    isRefetching: boolean;
    refetch: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    selectedIncident: SnowTicket | undefined;
    selectedIncidentIndex: number;
    onSelect: (incidentId: string) => void;
    onUnSelect?: (incidentId: string) => void;
    selectedIncidentId: string | null;
    showIncidentUpdateForm: boolean;
    selectedPriorityFilter: string | null;
    selectedStateFilter?: string | null;
    selectedAssignmentGroupFilter?: string | null;
    renderForm?: (incident: SnowTicket) => React.ReactNode;
}

const IncidentsList: React.FC<IncidentsListProps> = memo(
    ({
        incidentList,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        isRefetching,
        refetch,
        error,
        selectedIncident,
        selectedIncidentIndex,
        onSelect,
        onUnSelect,
        selectedIncidentId,
        showIncidentUpdateForm,
        renderForm,
        selectedStateFilter,
        selectedPriorityFilter,
        selectedAssignmentGroupFilter,
    }) => {
        const parentRef = useRef<HTMLDivElement>(null);

        const incidentCount = incidentList.length;

        const virtualizer = useVirtualizer({
            count: incidentCount,
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
            if (
                lastVirtualItemIndex === undefined ||
                !hasNextPage ||
                isFetchingNextPage ||
                !fetchNextPage ||
                selectedStateFilter ||
                selectedPriorityFilter ||
                selectedAssignmentGroupFilter
            )
                return;

            if (lastVirtualItemIndex >= incidentCount - 3) {
                if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
                debounceTimeoutRef.current = setTimeout(() => {
                    fetchNextPage();
                }, 200);
            }

            return () => {
                if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            };
        }, [lastVirtualItemIndex, incidentCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

        // Scroll to the selected incident when it changes
        useEffect(() => {
            if (!selectedIncidentId || showIncidentUpdateForm || selectedIncidentIndex < 0) return;
            const timer = setTimeout(() => {
                virtualizer.scrollToIndex(selectedIncidentIndex, { align: 'auto', behavior: 'smooth' });
            }, 100);
            return () => clearTimeout(timer);
        }, [selectedIncidentId, showIncidentUpdateForm, selectedIncidentIndex]);

        // Event-delegation click handler - one listener for the entire list
        // instead of per-card, avoids 800 event listener allocations.
        const handleTicketClick = useCallback(
            (event: React.MouseEvent<HTMLDivElement>) => {
                const card = (event.target as HTMLElement).closest('[data-incident-id]');
                const incidentId = card?.getAttribute('data-incident-id');
                if (!incidentId) return;
                if (incidentId === selectedIncidentId) {
                    onUnSelect?.(incidentId);
                } else {
                    onSelect?.(incidentId);
                }
            },
            [selectedIncidentId, onUnSelect, onSelect],
        );

        if (isLoading) return <ListSkeleton rows={20} className="p-2" />;
        if (isError) return <ErrorPlaceholder error={error} iconSize={150} onRetry={refetch} isRefetching={isRefetching} />;
        if (!incidentCount) return <EmptyPlaceholder onRetry={refetch} iconSize={150} isRefetching={isRefetching} message="No incidents found" />;

        const isFormVisible = !!selectedIncidentId && showIncidentUpdateForm;

        return (
            <>
                <Activity name="incident-list" mode={isFormVisible ? 'hidden' : 'visible'}>
                    <div className="flex flex-col h-full w-full relative">
                        <div ref={parentRef} className="overflow-y-auto flex-1 w-full relative" onClick={handleTicketClick}>
                            <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                                {virtualItems.map((virtualItem) => {
                                    const incident = incidentList[virtualItem.index];
                                    if (!incident) return null;
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
                                            <IncidentMetaDetailsCard
                                                incidentId={incident?.sys_id}
                                                incidentNumber={incident?.number}
                                                assignedTo={incident?.assigned_to}
                                                assignmentGroup={incident?.assignment_group}
                                                priority={incident?.priority}
                                                state={incident?.state}
                                                shortDescription={incident?.short_description}
                                                isSelected={incident?.sys_id?.value === selectedIncidentId}
                                                config={{ disableTooltip: true }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {isFetchingNextPage && (
                            <div className="p-3 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-200 shadow-sm shrink-0 z-10 animate-pulse">
                                Loading more incidents...
                            </div>
                        )}
                    </div>
                </Activity>

                {isFormVisible && selectedIncident ? renderForm?.(selectedIncident) : null}
            </>
        );
    },
);

export default IncidentsList;
