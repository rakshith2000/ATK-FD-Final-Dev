import type { LiteLLMProxy } from '../types/lite-llm-proxy';

export const isLiteLLMProxy = (value: unknown): value is LiteLLMProxy => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return typeof candidate.proxy_base_url === 'string' && typeof candidate.proxy_key === 'string';
};

export const isLiteLLMProxyArray = (value: unknown): value is LiteLLMProxy[] => {
    return Array.isArray(value) && value.every(isLiteLLMProxy);
};
