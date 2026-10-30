import { z } from 'zod';

export const DraftChangeRequestSchema = z.object({
    change_title: z.string(),
    change_purpose: z.string(),
    config_items: z.string(),
    os_info: z.string(),
    uploaded_files: z.string(),
});

export const ChangeDetailsSchema = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    short_description: z.string(),
    description: z.string(),
    implementation_plan: z.string(),

    // optional
    backout_plan: z.string().optional(),

    test_plan: z.string(),
    chg_model: z.string(),
});

export const DraftChangeResponseSchema = z.object({
    change_details: ChangeDetailsSchema,
    impact_analysis: z.string(),
});

export const PushChangesResponseSchema = z.object({
    number: z.string(),
    sys_id: z.string(),
});
