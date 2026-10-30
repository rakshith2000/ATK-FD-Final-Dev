import { z } from 'zod';

export const LiteLLMProxySchema = z.object({
    proxy_base_url: z.string(),
    proxy_key: z.string(),
});

export const OnboardLiteLLMProxyRequestSchema = z.object({
    proxy_base_url: z.string(),
    proxy_key: z.string(),
});

export const OnboardLiteLLMProxyResponseSchema = z.object({
    message: z.string(),
});

export const DeleteLiteLLMProxyResponseSchema = z.object({
    message: z.string(),
});
