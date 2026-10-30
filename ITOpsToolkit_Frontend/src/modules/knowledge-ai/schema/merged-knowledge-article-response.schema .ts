import { z } from 'zod';

export const mergedKnowledgeArticleResponseSchema = z.object({
    title: z.string().min(1),
    merged_article: z.string().min(1),
    // {} is valid; each value may be [] but any element must be non-empty
    details: z.record(z.string().min(1), z.array(z.string().min(1))),
});
