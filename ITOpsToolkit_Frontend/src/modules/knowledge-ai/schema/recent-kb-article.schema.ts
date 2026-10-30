import z from 'zod';

export const recentKBArticleSchema = z.object({
    number: z.string(),
    short_description: z.string(),
    kb_category: z.string(),
});

export const recentKBArticlesListSchema = z.array(recentKBArticleSchema);
