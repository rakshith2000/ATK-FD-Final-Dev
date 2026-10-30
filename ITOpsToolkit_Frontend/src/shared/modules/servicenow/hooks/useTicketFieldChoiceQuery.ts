import { useQuery } from '@tanstack/react-query';
import { fetchSnowTicketFieldChoicesByTikcetType, type TicketFieldChoice } from '../services/fetch-snow-ticket-state-choices-by-ticket-type';
import type { SnowTableName } from '../types/ticket';

export function useTicketFieldChoiceQuery(ticketType: SnowTableName, field: string) {
    const queryKey = ['ticketStateChoiceQuery', ticketType, field];
    const query = useQuery<Array<TicketFieldChoice>, Error, Array<{ label: string; value: string }>>({
        queryKey: queryKey,
        queryFn: fetchSnowTicketFieldChoicesByTikcetType.bind(null, { ticketType, field }),
        staleTime: 5 * 60 * 1000,
        select: (data) => data.map((c) => ({ label: c.label, value: c.value })),
    });

    return { ...query, queryKey };
}
