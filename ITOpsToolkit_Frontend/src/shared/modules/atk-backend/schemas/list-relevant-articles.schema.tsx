import z from 'zod';

export const listRelevantArticlesResponseSchema = z.object({
    articles_found: z.boolean(),
    kb_numbers: z.array(z.string()),
    knowledge_article_info: z.string(),
    explanation: z.string(),
    impact_analysis: z.string().optional(),
});
