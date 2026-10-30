import type { LLMTsListResponse, LLM } from '../types/llms';

export const isLLM = (value: unknown): value is LLM => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.llm_tag === 'string' &&
        typeof candidate.llm_type === 'string' &&
        typeof candidate.updated_by === 'string' &&
        typeof candidate.updated_at === 'string' &&
        typeof candidate.llm_config === 'object' &&
        candidate.llm_config !== null &&
        !Array.isArray(candidate.llm_config) &&
        Object.values(candidate.llm_config).every((val) => typeof val === 'string') &&
        (candidate.associated_agents_or_tools === null ||
            (Array.isArray(candidate.associated_agents_or_tools) && candidate.associated_agents_or_tools.every((item) => typeof item === 'string')))
    );
};

export const isLLMArray = (value: unknown): value is LLM[] => {
    return Array.isArray(value) && value.every(isLLM);
};

export function isLLMsListResponse(value: unknown): value is LLMTsListResponse {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                typeof (item as Record<string, unknown>).llm_tag === 'string' &&
                typeof (item as Record<string, unknown>).llm_type === 'string' &&
                typeof (item as Record<string, unknown>).updated_by === 'string',
        )
    );
}
