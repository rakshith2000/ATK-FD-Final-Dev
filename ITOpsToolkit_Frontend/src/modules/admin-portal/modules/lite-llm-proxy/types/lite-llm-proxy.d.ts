import type { z } from 'zod';
import type { LiteLLMProxySchema, OnboardLiteLLMProxyRequestSchema, OnboardLiteLLMProxyResponseSchema, DeleteLiteLLMProxyResponseSchema } from '../schemas/lite-llm-proxy.schemas';

export type LiteLLMProxy = z.infer<typeof LiteLLMProxySchema>;

export type OnboardLiteLLMProxyRequest = z.infer<typeof OnboardLiteLLMProxyRequestSchema>;

export type OnboardLiteLLMProxyResponse = z.infer<typeof OnboardLiteLLMProxyResponseSchema>;

export type DeleteLiteLLMProxyResponse = z.infer<typeof DeleteLiteLLMProxyResponseSchema>;
