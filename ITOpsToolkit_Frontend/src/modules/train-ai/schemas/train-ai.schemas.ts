import { z } from 'zod';

export const kbArticleFieldSchema = z
    .object({
        display_value: z.string().optional().default(''),
        value: z.string().optional().default(''),
    })
    .passthrough();

export const kbArticleFieldWithLinkSchema = kbArticleFieldSchema.extend({
    link: z.string().optional(),
});

export const newQuizKbArticleSchema = z
    .object({
        sys_id: kbArticleFieldSchema.optional(),
        number: kbArticleFieldSchema.optional(),
        short_description: kbArticleFieldSchema.optional(),
        kb_category: kbArticleFieldSchema.optional(),
        sys_created_on: kbArticleFieldSchema.optional(),
        author: kbArticleFieldWithLinkSchema.optional(),
        rating: kbArticleFieldSchema.optional(),
        workflow_state: kbArticleFieldSchema.optional(),
        text: kbArticleFieldSchema.optional(),
    })
    .passthrough();

export const newQuizKbArticlesResponseSchema = z.array(newQuizKbArticleSchema);
