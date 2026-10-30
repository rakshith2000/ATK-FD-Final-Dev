import { Route } from '@/routes/(app)/_app/(itops-ai)/itops-ai/(major-incident-management)/major-incident-management/incident-analysis';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import useGetIncidentByNumberQuery from '@/shared/modules/servicenow/hooks/useGetIncidentByNumberQuery';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import IncidentProgress from '../components/ui/IncidentProgress/IncidentProgress';
import { useGetMimDetails } from '../hooks';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';

const IncidentAnalysisPage = () => {
    const search = Route.useSearch();

    const incidentNumber = atob(search.inc);

    const incidentQuery = useGetIncidentByNumberQuery(incidentNumber);

    const incidentMimDetailsQuery = useGetMimDetails({ incident_number: incidentNumber, enabled: true });

    if (incidentQuery.isLoading) {
        return <LoadingPlaceholder />;
    }

    if (incidentQuery.isError) {
        return <ErrorPlaceholder error={incidentQuery?.error} iconSize={150} onRetry={incidentQuery?.refetch} isRefetching={incidentQuery?.isRefetching} />;
    }

    if (incidentMimDetailsQuery.isLoading) {
        return <LoadingPlaceholder />;
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

    const serviceNowIncidentLink = getServiceNowLink({ sysId: snowIncident?.sys_id?.value ?? '', type: 'incident' });

    if (!snowIncident) {
        throw new Error('Snow Incident data not found !');
    }

    const incidentMimDetails = incidentMimDetailsQuery?.data;

    if (!incidentMimDetails) {
        throw new Error('Incident MIM details data not found !');
    }

    return (
        <div className="w-full h-full flex flex-col gap-1 p-0.5 overflow-hidden bg-gray-50/50">
            {/* Header 1 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-1 mx-1 rounded-lg border border-slate-200/90 ring-2 ring-slate-200/40 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-(--brand-title-primary-color)">Incident Analysis</span>
                            <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">{incidentNumber}</span>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight"></h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RefetchButton
                        onRefetch={() => {
                            incidentQuery?.refetch();
                            incidentMimDetailsQuery?.refetch();
                        }}
                        isRefetching={incidentQuery.isRefetching || incidentMimDetailsQuery.isRefetching}
                        className="shadow-2xs border rounded-lg px-3.5 py-1.5 text-(--brand-title-primary-color) text-xs bg-(--brand-color)/0"
                        iconSize={14}
                    >
                        <span className="text-xs">Refresh</span>
                    </RefetchButton>

                    <Link
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all btn-split split-blue"
                        to={serviceNowIncidentLink}
                        target="_blank"
                    >
                        <span className="flex flex-row gap-2 justify-center items-center">
                            <ExternalLink size={13} />
                            <span>View in ServiceNow</span>
                        </span>
                    </Link>
                </div>
            </div>

            <IncidentProgress
                incidentNumber={incidentNumber}
                snowIncident={snowIncident}
                incidentMimDetails={incidentMimDetails}
                reloadQeries={() => {
                    incidentMimDetailsQuery.refetch();
                    incidentQuery.refetch();
                }}
            />
        </div>
    );
};

export default IncidentAnalysisPage;
