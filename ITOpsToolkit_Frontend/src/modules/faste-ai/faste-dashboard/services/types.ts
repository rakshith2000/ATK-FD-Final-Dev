import { z } from 'zod';

export const ticketSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    ticket_id: z.union([z.string(), z.number()]).optional(),
    number: z.string(),
    created_on: z.string().optional(),
    resolved: z.union([z.boolean(), z.string()]).optional(),
    escalation_state: z.union([z.boolean(), z.string()]).optional(),
    dashboard_category: z.string().optional(),
    ticket_category: z.string().optional(),
    escalation_category: z.array(z.string()).optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    assignment_group: z.string().optional(),
    assigned_to: z.string().optional(),
    cmdb_ci: z.string().optional(),
    priority: z.union([z.string(), z.number()]).optional(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const reassignPayloadSchema = z.object({
    assignedTo: z.string(),
    workNotes: z.string(),
    shortDescription: z.string(),
    description: z.string(),
});

export type ReassignPayload = z.infer<typeof reassignPayloadSchema>;

export const ESCALATION_METRICS_SCHEMA = [
    { key: 'SOP Not Found', display: 'SOP Not Found' },
    { key: 'SOP gap', display: 'SOP Gap' },
    { key: 'Connectivity issues', display: 'Connectivity Issues' },
    { key: 'access issue', display: 'Access Issue' },
    { key: 'error', display: 'Error' },
    { key: 'timeout', display: 'Timeout' },
] as const;

export type EscalationMetricKey = (typeof ESCALATION_METRICS_SCHEMA)[number]['key'];
