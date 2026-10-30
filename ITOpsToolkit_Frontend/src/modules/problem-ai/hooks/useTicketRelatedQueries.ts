import { useQuery } from '@tanstack/react-query';
import { fetchSnowTicketRelatedProblemsByCmdbCiId } from '../services/fetch-snow-ticket-related-problems-by-cmdb-ci-id';
import { fetchSnowTicketRelatedProblemAlertsByTicketSysId } from '../services/fetch-snow-ticket-related-problem-alerts-by-ticket-sys-id';
import { fetchSnowTicketRelatedIncidentByTicketSysId } from '@/shared/modules/servicenow/services/fetch-related-problem-by-sys-id';

interface UseTicketRelatedQueriesParams {
    selectedTicketId: string | null;
    cmdbCiValue: string | null | undefined;
}

export function useTicketRelatedQueries({ selectedTicketId, cmdbCiValue }: UseTicketRelatedQueriesParams) {
    const ticketRelatedIncidentsKey = ['ticketRelatedIncidents', selectedTicketId, cmdbCiValue];
    const ticketRelatedProblemAlertsKey = ['ticketRelatedProblemAlerts', selectedTicketId];
    const ticketRelatedProblemsKey = ['ticketRelatedProblems', selectedTicketId, cmdbCiValue];

    const ticketRelatedIncidents = useQuery({
        queryKey: ticketRelatedIncidentsKey,
        queryFn: fetchSnowTicketRelatedIncidentByTicketSysId.bind(null, { ticketId: selectedTicketId ?? undefined }),
        enabled: !!selectedTicketId,
        staleTime: 5 * 60 * 1000,
    });

    const ticketRelatedProblems = useQuery({
        queryKey: ticketRelatedProblemsKey,
        queryFn: fetchSnowTicketRelatedProblemsByCmdbCiId.bind(null, { cmdbCiId: cmdbCiValue, currentTicketSysId: selectedTicketId }),
        enabled: !!selectedTicketId && !!cmdbCiValue,
        staleTime: 5 * 60 * 1000,
    });

    const ticketRelatedProblemAlerts = useQuery({
        queryKey: ticketRelatedProblemAlertsKey,
        queryFn: fetchSnowTicketRelatedProblemAlertsByTicketSysId.bind(null, { ticketId: selectedTicketId ?? undefined }),
        enabled: !!selectedTicketId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        ticketRelatedIncidents: { ...ticketRelatedIncidents, queryKey: ticketRelatedIncidentsKey },
        ticketRelatedProblems: { ...ticketRelatedProblems, queryKey: ticketRelatedProblemsKey },
        ticketRelatedProblemAlerts: { ...ticketRelatedProblemAlerts, queryKey: ticketRelatedProblemAlertsKey },
    };
}
