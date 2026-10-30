import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import type { MimDataResponse } from '../types';
import { getSnowFieldValueOrDisplay } from '@/shared/modules/servicenow/utils/servicenow-field-helpers';
import { getMimIncidentDetails } from './get-mim-incident-details';

const calculateIncidentCompletedTillStep = ({ mimData, snowIncident }: { mimData?: MimDataResponse; snowIncident?: SnowTicket }): number => {
    const incDetails = getMimIncidentDetails(mimData);

    // Step 1: Incident Created -> completed if snowTicket (or mimData) has both sys_created_by and sys_created_on
    const createdBy = getSnowFieldValueOrDisplay(snowIncident?.sys_created_by) || incDetails?.sys_created_by;
    const createdOn = getSnowFieldValueOrDisplay(snowIncident?.sys_created_on) || incDetails?.sys_created_on;
    const isStep1Completed = Boolean(createdBy && createdOn);

    if (!isStep1Completed) {
        return 0;
    }

    // Step 2: Acknowledged -> completed if mimData has assigned_to and assignment_group
    const assignedTo = getSnowFieldValueOrDisplay(snowIncident?.assigned_to) || incDetails?.assigned_to;
    const assignmentGroup = getSnowFieldValueOrDisplay(snowIncident?.assignment_group) || incDetails?.assignment_group;
    const isStep2Completed = Boolean(assignedTo && assignmentGroup);

    if (!isStep2Completed) {
        return 1;
    }

    // Step 3: Schedule Meeting & Invite -> completed if mimData has threadId and invitees
    const threadId = mimData?.meeting_details?.threadId || (mimData as unknown as Record<string, unknown>)?.threadId;
    const invitees = mimData?.invitees || (mimData as unknown as Record<string, unknown>)?.invites;
    const hasInvitees = Array.isArray(invitees) && invitees.length > 0;
    const isStep3Completed = Boolean(threadId && hasInvitees);

    if (!isStep3Completed) {
        return 2;
    }

    // Step 4: Meeting Summary & Transcripts -> completed if mimData has meeting_start_datetime and participants
    const meetingStart = mimData?.meeting_start_datetime;
    const participants = mimData?.participants;
    const hasParticipants = Array.isArray(participants) && participants.length > 0;
    const isStep4Completed = Boolean(meetingStart && hasParticipants);

    if (!isStep4Completed) {
        return 3;
    }

    // Step 5: Identified Root Cause -> completed if RCA is present
    const rca = mimData?.rca;
    const isStep5Completed = Boolean(rca && rca.trim().length > 0);

    if (!isStep5Completed) {
        return 4;
    }

    // Step 6: Steps taken to resolve this issue -> completed if resolution/close notes or work notes present
    const closeNotes = getSnowFieldValueOrDisplay(snowIncident?.close_notes) || incDetails?.close_notes || incDetails?.work_notes;
    const isStep6Completed = Boolean(closeNotes && closeNotes.trim().length > 0);

    if (!isStep6Completed) {
        return 5;
    }

    // Step 7: Open Time - Resolved time -> completed if ticket state is Resolved/Closed OR both created and resolved times exist
    const ticketState = mimData?.ticket_state || incDetails?.state || getSnowFieldValueOrDisplay(snowIncident?.state);
    const resolvedOnRaw =
        getSnowFieldValueOrDisplay(snowIncident?.resolved_at) ||
        getSnowFieldValueOrDisplay(snowIncident?.closed_at) ||
        getSnowFieldValueOrDisplay(snowIncident?.sys_updated_on) ||
        (typeof incDetails?.sys_updated_on === 'string' ? incDetails.sys_updated_on : '');

    const isResolvedOrClosed = ticketState === 'Resolved' || ticketState === 'Closed' || ticketState === '6' || ticketState === '7' || Boolean(createdOn && resolvedOnRaw);

    if (!isResolvedOrClosed) {
        return 6;
    }

    return 7;
};

export default calculateIncidentCompletedTillStep;
