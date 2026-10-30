import type { GenerateKBArticleResponse } from '../types/knowledge-base';

export function isGenereatedKBArticleResponse(value: unknown): value is GenerateKBArticleResponse {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;

    if (typeof v.title !== 'string') return false;
    if (typeof v.generated_article !== 'string') return false;

    return true;
}
