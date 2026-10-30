import z from 'zod';

export const knowledgeArticleSchema = z.object({
    content: z.string(),
    kb_metadata: z.object({
        roles: z.array(z.string()),
        title: z.string(),
        author: z.string(),
        number: z.string(),
        rating: z.union([z.string(), z.number(), z.null()]).transform((value) => String(value ?? '')),
        kb_link: z.string(),
        kb_category: z.string(),
        kb_knowledge_base: z.string(),
        ai_score: z.number().optional(),
    }),
});

const duplicateKBArticleMapSchema = z.record(z.string(), knowledgeArticleSchema);

const duplicateKBCategoryMapSchema = z.record(z.string(), z.array(duplicateKBArticleMapSchema));

export const duplicateKBCatalogSchema = z.array(duplicateKBCategoryMapSchema);
