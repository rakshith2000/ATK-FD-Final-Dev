import type React from 'react';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';

interface IncidentRcaTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const IncidentRcaTab: React.FC<IncidentRcaTabProps> = ({ mimData }) => {
    const rcaText = mimData?.rca;

    return (
        <div className="w-full h-full min-h-0 flex flex-col gap-3 p-1.5 overflow-y-auto">
            <div className="flex bg-white flex-col gap-1.5 p-0.5 rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                <TitleWithArraow title="Root Cause Analysis (RCA)" className="text-xs w-max" />
                <div className="px-3 py-1">
                    {rcaText ? <RenderMarkdown text={rcaText} /> : <div className="text-xs text-gray-400">Root cause analysis details are not available yet.</div>}
                </div>
            </div>
        </div>
    );
};

export default IncidentRcaTab;
