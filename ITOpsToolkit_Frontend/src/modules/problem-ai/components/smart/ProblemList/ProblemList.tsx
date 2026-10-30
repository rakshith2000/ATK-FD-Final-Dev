import { memo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import ProblemCard from '../../ui/ProblemCard/ProblemCard';
import type { ProblemTicket } from '../../../types/problem-ai';
import type { ProblemStatusFilter } from '../../../constants/problem-status-filter-options';

interface ProblemListProps {
    ticketsQuery: UseQueryResult<ProblemTicket[], Error> & { filteredTickets: ProblemTicket[] };
    status: ProblemStatusFilter;
    selectedTicketId: string | null;
    onSelect: (ticket: ProblemTicket) => void;
}

const ProblemList: React.FC<ProblemListProps> = memo(({ ticketsQuery, status, selectedTicketId, onSelect }) => {
    if (ticketsQuery.isLoading) return <ListSkeleton rows={6} className="p-2" VW={300} />;
    if (ticketsQuery.isError) return <ErrorPlaceholder error={ticketsQuery.error} onRetry={ticketsQuery.refetch} isRefetching={ticketsQuery.isRefetching} />;
    if (!ticketsQuery.filteredTickets.length) return <EmptyPlaceholder message="No tickets found" onRetry={ticketsQuery.refetch} isRefetching={ticketsQuery.isRefetching} />;

    return (
        <div className="flex flex-col pb-2">
            {ticketsQuery.filteredTickets.map((problem) => (
                <ProblemCard key={problem.id} problem={problem} status={status} isActive={selectedTicketId === problem.id} onClick={onSelect} />
            ))}
        </div>
    );
});

ProblemList.displayName = 'ProblemList';

export default ProblemList;
