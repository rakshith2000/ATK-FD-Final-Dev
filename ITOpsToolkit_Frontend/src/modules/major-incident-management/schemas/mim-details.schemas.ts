import { z } from 'zod';

export const MimDetailsRequestSchema = z.object({
    incident_number: z.string().min(1, 'Incident number is required'),
});

export const MimConversationMessageSchema = z.object({
    role: z.string(),
    content: z.string(),
});

export const MimIncidentDetailsSchema = z
    .object({
        state: z.string().optional(),
        number: z.string().optional(),
        sys_id: z.string().optional(),
        cmdb_ci: z.string().optional(),
        category: z.string().optional(),
        comments: z.string().optional(),
        location: z.string().optional(),
        priority: z.string().optional(),
        caller_id: z.string().optional(),
        work_notes: z.string().optional(),
        assigned_to: z.string().optional(),
        close_notes: z.string().optional(),
        description: z.string().optional(),
        ticket_link: z.string().optional(),
        sys_created_by: z.string().optional(),
        sys_created_on: z.string().optional(),
        assignment_group: z.string().optional(),
        short_description: z.string().optional(),
    })
    .passthrough();

export const MimMeetingDetailsSchema = z
    .object({
        threadId: z.string().optional(),
        meeting_id: z.string().optional(),
    })
    .passthrough();

export const MimDataResponseSchema = z.object({
    id: z.string(),
    incident_number: z.string().optional(),
    ticket_state: z.string().optional(),
    meeting_start_datetime: z.string().optional(),
    meeting_details: MimMeetingDetailsSchema.optional(),
    incident_details: MimIncidentDetailsSchema.optional(),
    participants: z.array(z.string()).optional(),
    invitees: z.array(z.string()).optional(),
    conversation_history: z.array(MimConversationMessageSchema).optional(),
    incident_summary: z.string().optional(),
    rca: z.string().optional(),
});
