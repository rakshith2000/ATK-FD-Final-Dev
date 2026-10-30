import { useQuery } from '@tanstack/react-query';
import { fetchSnowTicketRelatedIncidentsByCmdbCiId } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-incidents-by-cmdb-ci-id';
import { fetchSnowTicketRelatedChangesByCmdbCiId } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-changes-by-cmdb-ci-id';
import { fetchSnowTicketRelatedAlertsByTicketSysId } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-alerts-by-ticket-sys-id';

interface UseIncidentRelatedQueriesParams {
    selectedIncidentId: string | null;
    cmdbCiValue: string | null | undefined;
}

export function useIncidentRelatedQueries({ selectedIncidentId, cmdbCiValue }: UseIncidentRelatedQueriesParams) {
    const incidentRelatedIncidentsKey = ['incidenttRelatedIncidents', selectedIncidentId, cmdbCiValue];
    const incidentRelatedChangesKey = ['incidentRelatedChanges', selectedIncidentId, cmdbCiValue];
    const incidentRelatedAlertsKey = ['incidentRelatedAlerts', selectedIncidentId];

    const incidentRelatedIncidents = useQuery({
        queryKey: incidentRelatedIncidentsKey,
        queryFn: fetchSnowTicketRelatedIncidentsByCmdbCiId.bind(null, { cmdbCiId: cmdbCiValue, currentTicketSysId: selectedIncidentId }),
        enabled: !!selectedIncidentId && !!cmdbCiValue,
        staleTime: 5 * 60 * 1000,
    });

    const incidentRelatedChanges = useQuery({
        queryKey: incidentRelatedChangesKey,
        queryFn: fetchSnowTicketRelatedChangesByCmdbCiId.bind(null, { cmdbCiId: cmdbCiValue }),
        enabled: !!selectedIncidentId && !!cmdbCiValue,
        staleTime: 5 * 60 * 1000,
    });

    const incidentRelatedAlerts = useQuery({
        queryKey: incidentRelatedAlertsKey,
        queryFn: fetchSnowTicketRelatedAlertsByTicketSysId.bind(null, { ticketId: selectedIncidentId ?? undefined }),
        enabled: !!selectedIncidentId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        incidentRelatedIncidents: { ...incidentRelatedIncidents, queryKey: incidentRelatedIncidentsKey },
        incidentRelatedChanges: { ...incidentRelatedChanges, queryKey: incidentRelatedChangesKey },
        incidentRelatedAlerts: { ...incidentRelatedAlerts, queryKey: incidentRelatedAlertsKey },
    };
}
