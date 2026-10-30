import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type z from 'zod';
import { listRelevantArticlesResponseSchema } from '../schemas/list-relevant-articles.schema';

export type ListRelevantArticlesResponse = z.infer<typeof listRelevantArticlesResponseSchema>;

export interface ListRelevantArticlesRequest {
    incident_details: Record<string, unknown>;
}

export function listRelevantArticlesResponseToMarkdown(data?: ListRelevantArticlesResponse): string {
    if (!data) return '';

    const lines: string[] = [];

    lines.push(`**Articles Found:** ${data.articles_found ? 'Yes' : 'No'}`);

    if (data.kb_numbers.length > 0) {
        lines.push(`\n**KB Numbers:**`);
        data.kb_numbers.forEach((kb) => lines.push(`- ${kb}`));
    }

    if (data.knowledge_article_info) {
        lines.push(`\n**Knowledge Article Info:**\n${data.knowledge_article_info}`);
    }

    if (data.explanation) {
        lines.push(`\n**Explanation:**\n${data.explanation}`);
    }

    if (data.impact_analysis) {
        lines.push(`${data.impact_analysis}`);
    }

    return lines.join('\n');
}

const listRelevantArticles = async (payload: ListRelevantArticlesRequest): Promise<ListRelevantArticlesResponse> => {
    return withApiResponseHandler<ListRelevantArticlesResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.listRelevantArticles, {
            ...payload,
        });

        if (!response?.data?.output?.data) {
            throw new Error('Unable to get the relevant articles response from API !, response?.data?.output?.data is invalid !');
        }

        return await listRelevantArticlesResponseSchema.parseAsync(response?.data?.output?.data);
    });
};

export default listRelevantArticles;
