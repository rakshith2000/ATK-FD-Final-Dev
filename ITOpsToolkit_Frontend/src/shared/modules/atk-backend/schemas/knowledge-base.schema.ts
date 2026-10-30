import z from 'zod';

const scoreDetailsSchema = z.object({
    score: z.number(),
    justification: z.string(),
});

export const KbArticleAIScoringSchema = z.object({
    // omitted or undefined is fine; if present it must be >= 3 chars
    kb_number: z.string().min(3).optional(),
    score_details: z.record(z.string(), scoreDetailsSchema),
    average_score: z.number(),
});
