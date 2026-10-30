import { useQuery } from '@tanstack/react-query';
import { fetchSnowActiveTicketDetails, type ActiveTicketDetail } from '../services/fetch-snow-active-ticket-details';

export const useActiveTicketDetails = (ticketNumbers: string[]): Record<string, ActiveTicketDetail> => {
    const normalizedNumbers = Array.from(new Set(ticketNumbers.map((num) => String(num).trim().toUpperCase()).filter((num) => num.length > 0))).sort();

    const { data } = useQuery<Record<string, ActiveTicketDetail>>({
        queryKey: ['faste-active-ticket-details', normalizedNumbers],
        queryFn: () => fetchSnowActiveTicketDetails(normalizedNumbers),
        enabled: normalizedNumbers.length > 0,
        refetchInterval: 30000,
        staleTime: 15000,
    });

    return data ?? {};
};
