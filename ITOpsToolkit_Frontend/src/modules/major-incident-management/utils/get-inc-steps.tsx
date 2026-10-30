import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import type { MimDataResponse } from '../types';
import { getSnowFieldDisplayValue } from '@/shared/modules/servicenow/utils/servicenow-field-helpers';
import { formatLocalDate } from '@/shared/utils/format-local-date';
import { AlertTriangle, CheckCircle2, Clock, Play, Ticket, Video, Wrench } from 'lucide-react';
import { getMimIncidentDetails } from './get-mim-incident-details';

const getIncidentSteps = ({ mimData, snowIncident }: { mimData: MimDataResponse; snowIncident: SnowTicket }) => {
    const incDetails = getMimIncidentDetails(mimData);

    const createdBy = getSnowFieldDisplayValue(snowIncident?.sys_created_by, incDetails?.sys_created_by || '');
    const createdOnRaw = getSnowFieldDisplayValue(snowIncident?.sys_created_on, incDetails?.sys_created_on || '');
    const createdOn = formatLocalDate(createdOnRaw) || '';
    const group = getSnowFieldDisplayValue(snowIncident?.assignment_group, incDetails?.assignment_group || '');
    const assignee = getSnowFieldDisplayValue(snowIncident?.assigned_to, incDetails?.assigned_to || '');

    const meetingStart = mimData?.meeting_start_datetime ? formatLocalDate(mimData.meeting_start_datetime) : '';
    const hasRca = Boolean(mimData?.rca && mimData.rca.trim().length > 0);

    const closeNotes = getSnowFieldDisplayValue(snowIncident?.close_notes, incDetails?.close_notes || incDetails?.work_notes || '');
    const hasResolutionNotes = Boolean(closeNotes && closeNotes.trim().length > 0);

    const ticketState = mimData?.ticket_state || incDetails?.state || getSnowFieldDisplayValue(snowIncident?.state, '');
    const resolvedOnRaw =
        getSnowFieldDisplayValue(snowIncident?.resolved_at, '') ||
        getSnowFieldDisplayValue(snowIncident?.closed_at, '') ||
        getSnowFieldDisplayValue(snowIncident?.sys_updated_on, '') ||
        (typeof incDetails?.sys_updated_on === 'string' ? incDetails.sys_updated_on : '');

    const isResolvedOrClosed = ticketState === 'Resolved' || ticketState === 'Closed' || ticketState === '6' || ticketState === '7' || Boolean(createdOnRaw && resolvedOnRaw);

    return [
        {
            id: 1,
            title: 'Incident Created',
            icon: <Ticket className="size-3.5" />,
            body: (
                <div className="flex flex-col gap-0.5">
                    <p>
                        Created by <span>{createdBy}</span> at <span>{createdOn}</span>
                    </p>
                </div>
            ),
        },
        {
            id: 2,
            title: 'Acknowledgement',
            icon: <CheckCircle2 className="size-3.5" />,
            body: (
                <span className="flex flex-col gap-1">
                    <p>
                        Group: <span className="font-medium text-foreground">{group}</span>
                    </p>
                    {assignee && (
                        <p>
                            Assignee: <span className="font-medium text-foreground">{assignee}</span>
                        </p>
                    )}
                </span>
            ),
        },
        {
            id: 3,
            title: 'Schedule Meeting & Invite',
            icon: <Video className="size-3.5" />,
            body: (
                <span className="flex flex-col gap-1">
                    <p>
                        Start Time: <span className="font-medium text-foreground">{meetingStart}</span>
                    </p>
                    <p>
                        Invitees: <span className="font-medium text-foreground">{mimData?.invitees?.length ?? 0} People</span>
                    </p>
                </span>
            ),
        },
        {
            id: 4,
            title: 'Meeting Summary & Transcripts',
            icon: <Play className="size-3.5" />,
            body: (
                <span className="flex flex-col gap-1">
                    <p>
                        Participants: <span className="font-medium text-foreground">{mimData?.participants?.length ?? 0} People</span>
                    </p>
                </span>
            ),
        },
        {
            id: 5,
            title: 'Identified Root Cause',
            icon: <AlertTriangle className="size-3.5" />,
            body: (
                <span className="flex flex-col gap-1">
                    <p>
                        Root Cause: <span className="font-medium text-foreground">{hasRca ? 'Identified' : 'Pending'}</span>
                    </p>
                </span>
            ),
        },
        {
            id: 6,
            title: 'Steps taken to resolve this issue',
            icon: <Wrench className="size-3.5" />,
            body: (
                <span className="flex flex-col gap-1">
                    <p>
                        Resolution Notes: <span className="font-medium text-foreground">{hasResolutionNotes ? 'Available' : 'Pending'}</span>
                    </p>
                </span>
            ),
        },
        {
            id: 7,
            title: 'Open Time - Resolved time',
            icon: <Clock className="size-3.5" />,
            body: (
                <span className="flex flex-col gap-1">
                    <p>
                        SLA Status: <span className="font-medium text-foreground">{isResolvedOrClosed ? ticketState || 'Resolved' : 'In Progress'}</span>
                    </p>
                </span>
            ),
        },
    ];
};

export default getIncidentSteps;
