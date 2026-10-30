import type React from 'react';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import FieldInfoCard from '../../ui/FieldInfoCard/FieldInfoCard';
import { formatLocalDate } from '@/shared/utils/format-local-date';
import { getSnowFieldValueOrDisplay } from '@/shared/modules/servicenow/utils/servicenow-field-helpers';
import { getMimIncidentDetails } from '@/modules/major-incident-management/utils/get-mim-incident-details';
import { Calendar, Clock, CheckCircle2, Timer } from 'lucide-react';

interface IncidentOpenVsResolvedTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const calculateDurationText = (createdStr?: string, resolvedStr?: string): string => {
    if (!createdStr) return 'N/A';

    const createdDate = new Date(createdStr.includes('T') ? createdStr : createdStr.replace(' ', 'T') + 'Z');
    if (isNaN(createdDate.getTime())) return 'N/A';

    const resolvedDate = resolvedStr ? new Date(resolvedStr.includes('T') ? resolvedStr : resolvedStr.replace(' ', 'T') + 'Z') : new Date();
    if (isNaN(resolvedDate.getTime())) return 'N/A';

    const diffMs = resolvedDate.getTime() - createdDate.getTime();
    if (diffMs <= 0) return '0 mins';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} Days`);
    if (hours > 0) parts.push(`${hours} Hours`);
    parts.push(`${mins} Mins`);

    return parts.join(' ');
};

const IncidentOpenVsResolvedTab: React.FC<IncidentOpenVsResolvedTabProps> = ({ mimData, snowIncident }) => {
    const incDetails = getMimIncidentDetails(mimData);

    const createdOnRaw: string = getSnowFieldValueOrDisplay(snowIncident?.sys_created_on) || (typeof incDetails?.sys_created_on === 'string' ? incDetails.sys_created_on : '');

    const resolvedOnRaw: string =
        getSnowFieldValueOrDisplay(snowIncident?.resolved_at) ||
        getSnowFieldValueOrDisplay(snowIncident?.closed_at) ||
        getSnowFieldValueOrDisplay(snowIncident?.sys_updated_on) ||
        (typeof incDetails?.sys_updated_on === 'string' ? incDetails.sys_updated_on : '');

    const ticketStateRaw = mimData?.ticket_state || incDetails?.state || getSnowFieldValueOrDisplay(snowIncident?.state) || '';

    const isResolvedOrClosed =
        ticketStateRaw === 'Resolved' || ticketStateRaw === 'Closed' || ticketStateRaw === '6' || ticketStateRaw === '7' || Boolean(createdOnRaw && resolvedOnRaw);

    const displayStatus = isResolvedOrClosed ? (ticketStateRaw && ticketStateRaw !== '6' && ticketStateRaw !== '7' ? ticketStateRaw : 'Resolved') : 'In Progress';

    const createdFormatted: string = createdOnRaw ? formatLocalDate(createdOnRaw) || createdOnRaw : '';
    const resolvedFormatted: string = resolvedOnRaw ? formatLocalDate(resolvedOnRaw) || resolvedOnRaw : '';

    const durationText: string = calculateDurationText(createdOnRaw, resolvedOnRaw);

    return (
        <div className="w-full h-full min-h-0 flex flex-col gap-3 p-1.5 overflow-y-auto">
            <div className="flex bg-white flex-col gap-1.5 p-0.5 rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                <TitleWithArraow title="Resolution Timeline & Metrics" className="text-xs w-max" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-2">
                    <FieldInfoCard title="Status">
                        <span className="text-(--brand-color)">
                            <CheckCircle2 size={13} />
                        </span>
                        <span className="text-(--brand-color) font-semibold">{displayStatus}</span>
                    </FieldInfoCard>

                    <FieldInfoCard title="Opened Time">
                        <span className="text-(--brand-color)">
                            <Calendar size={13} />
                        </span>
                        <span className="text-(--brand-color)">{createdFormatted}</span>
                    </FieldInfoCard>

                    <FieldInfoCard title="Resolved Time">
                        <span className="text-(--brand-color)">
                            <Clock size={13} />
                        </span>
                        <span className="text-(--brand-color)">{resolvedFormatted}</span>
                    </FieldInfoCard>

                    <FieldInfoCard title="Time Taken to Complete">
                        <span className="text-(--brand-color)">
                            <Timer size={13} />
                        </span>
                        <span className="text-(--brand-color) font-bold">{durationText}</span>
                    </FieldInfoCard>
                </div>
            </div>
        </div>
    );
};

export default IncidentOpenVsResolvedTab;
