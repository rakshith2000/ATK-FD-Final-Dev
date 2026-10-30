import { z } from 'zod';

export const ChangeDashboardRequestSchema = z.object({
    priorities: z.array(z.number()).optional(),
    assignment_groups: z.array(z.string()).optional(),
    assigned_to: z.string().optional(),
    states: z.array(z.number()).optional(),
    dateRange: z
        .object({
            start: z.string(),
            end: z.string(),
        })
        .optional(),
});

export const ChangeDashboardFieldSchema = z
    .object({
        value: z.string().nullable().optional(),
        display_value: z.string().nullable().optional(),
    })
    .passthrough();

export const ChangeDashboardRecordSchema = z
    .object({
        sys_id: ChangeDashboardFieldSchema.optional(),
        number: ChangeDashboardFieldSchema.optional(),
        short_description: ChangeDashboardFieldSchema.optional(),
        priority: ChangeDashboardFieldSchema.optional(),
        state: ChangeDashboardFieldSchema.optional(),
        type: ChangeDashboardFieldSchema.optional(),
        assignment_group: ChangeDashboardFieldSchema.optional(),
        assigned_to: ChangeDashboardFieldSchema.optional(),
        sys_created_on: ChangeDashboardFieldSchema.optional(),
        sys_updated_on: ChangeDashboardFieldSchema.optional(),
        risk: ChangeDashboardFieldSchema.optional(),
        start_date: ChangeDashboardFieldSchema.optional(),
        end_date: ChangeDashboardFieldSchema.optional(),
        closed_at: ChangeDashboardFieldSchema.optional(),
        made_sla: ChangeDashboardFieldSchema.optional(),
        reopen_count: ChangeDashboardFieldSchema.optional(),
    })
    .passthrough();

export const ChangeDashboardDataResponseSchema = z.object({
    result: z.array(ChangeDashboardRecordSchema).optional(),
});

export const ChangeDashboardResponseSchema = z.array(ChangeDashboardRecordSchema);
