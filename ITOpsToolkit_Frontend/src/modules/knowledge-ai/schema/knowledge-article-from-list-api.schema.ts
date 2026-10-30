import z from 'zod';

export const displayValueSchema = z.object({
    display_value: z.string(),
    value: z.string(),
});

export const knowledgeArticleFromListApiSchema = z.object({
    sys_id: displayValueSchema,
    number: displayValueSchema,
    short_description: displayValueSchema,
    kb_knowledge_base: displayValueSchema,
    sys_created_on: displayValueSchema,
    author: displayValueSchema,
    rating: displayValueSchema,
    workflow_state: displayValueSchema,
    text: displayValueSchema,
    kb_category: displayValueSchema,
    ai_score: z.number().optional(),
});

export const knowledgeArticlesFromListApiSchema = z.array(knowledgeArticleFromListApiSchema);
