import z from 'zod';

const summaryResponseSchema = z.object({
    articles_found: z.boolean(),
    kb_numbers: z.array(z.string()),
    knowledge_article_info: z.string(),
    explanation: z.string(),
    impact_analysis: z.string().optional(),
});

const retrievedArticleSchema = z
    .object({
        content: z.string().optional(),
        kb_metadata: z
            .object({
                number: z.string().optional(),
                title: z.string().optional(),
                kb_link: z.string().optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();

export const listRelevantArticlesResponseSchema = z
    .union([summaryResponseSchema, z.array(retrievedArticleSchema), z.string().refine((message) => message.toLowerCase().includes('no matching knowledge base articles found'))])
    .transform((response) => {
        if (typeof response === 'string') {
            return {
                articles_found: false,
                kb_numbers: [],
                knowledge_article_info: '',
                explanation: response,
            };
        }

        if (!Array.isArray(response)) return response;

        const kbNumbers = response.map((article) => article.kb_metadata?.number).filter((number): number is string => typeof number === 'string' && number.length > 0);

        const knowledgeArticleInfo = response
            .map((article) => {
                const metadata = article.kb_metadata;
                const title = metadata?.title ?? metadata?.number ?? 'Knowledge Article';
                const details = [metadata?.number ? `**Number:** ${metadata.number}` : '', metadata?.kb_link ? `**Link:** ${metadata.kb_link}` : '', article.content ?? ''].filter(
                    Boolean,
                );

                return `### ${title}\n\n${details.join('\n\n')}`;
            })
            .join('\n\n');

        return {
            articles_found: response.length > 0,
            kb_numbers: kbNumbers,
            knowledge_article_info: knowledgeArticleInfo,
            explanation: '',
        };
    });
