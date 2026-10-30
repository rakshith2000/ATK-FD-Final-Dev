import { Route } from '@/routes/(app)/_app/(itops-ai)/itops-ai/(major-incident-management)/major-incident-management/incident-analysis';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import useGetIncidentByNumberQuery from '@/shared/modules/servicenow/hooks/useGetIncidentByNumberQuery';
import { useGetMimDetails } from '@/modules/major-incident-management/hooks';
import IncidentAnalysisRevamp from '../components/smart/IncidentAnalysisRevamp/IncidentAnalysisRevamp';

const IncidentAnalysisRevampPage = () => {
    const search = Route.useSearch();

    const incidentNumber = atob(search.inc);

    const incidentQuery = useGetIncidentByNumberQuery(incidentNumber);

    const incidentMimDetailsQuery = useGetMimDetails({ incident_number: incidentNumber, enabled: true });

    if (incidentQuery.isLoading || incidentMimDetailsQuery.isLoading) {
        return <LoadingPlaceholder />;
    }

    if (incidentQuery.isError) {
        return <ErrorPlaceholder error={incidentQuery?.error} iconSize={150} onRetry={incidentQuery?.refetch} isRefetching={incidentQuery?.isRefetching} />;
    }

    if (incidentMimDetailsQuery.isError) {
        return (
            <ErrorPlaceholder
                error={incidentMimDetailsQuery?.error}
                iconSize={150}
                onRetry={incidentMimDetailsQuery?.refetch}
                isRefetching={incidentMimDetailsQuery?.isRefetching}
            />
        );
    }

    const snowIncident = incidentQuery?.data;

    if (!snowIncident) {
        throw new Error('Snow Incident data not found !');
    }

    const incidentMimDetails = incidentMimDetailsQuery?.data;

    if (!incidentMimDetails) {
        throw new Error('Incident MIM details data not found !');
    }

    return (
        <IncidentAnalysisRevamp
            incidentNumber={incidentNumber}
            snowIncident={snowIncident}
            incidentMimDetails={incidentMimDetails}
            isRefreshing={incidentQuery.isRefetching || incidentMimDetailsQuery.isRefetching}
            reload={() => {
                incidentQuery.refetch();
                incidentMimDetailsQuery.refetch();
            }}
        />
    );
};

export default IncidentAnalysisRevampPage;
