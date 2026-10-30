import { z } from 'zod';

export const sopSchema = z.object({
    id: z.number(),
    sop_name: z.string(),
    sop_content: z.string(),
    category: z.string(),
    created_by: z.string().optional(),
    is_approved: z.enum(['True', 'False']),
    kb_number: z.string().optional(),
});

export type SOP = z.infer<typeof sopSchema>;

export const sopVectorSchema = z.object({
    id: z.number(),
    sop_name: z.string(),
});

export type SOPVector = z.infer<typeof sopVectorSchema>;
