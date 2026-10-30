import { z } from 'zod';

export const LLMSchema = z.object({
    llm_tag: z.string(),
    llm_type: z.string(),
    llm_config: z.record(z.string(), z.string()),
    updated_by: z.string(),
    updated_at: z.string(),
    associated_agents_or_tools: z.array(z.string()).nullable(),
});

export const LLMArraySchema = z.array(LLMSchema);

export const LLMListItemSchema = z.object({
    llm_tag: z.string(),
    llm_type: z.string(),
    updated_by: z.string(),
});

export const LLMTsListResponseSchema = z.array(LLMListItemSchema);

export const OnboardLLMRequestSchema = z.object({
    llm_tag: z.string(),
    llm_type: z.string(),
    llm_config: z.record(z.string(), z.string()),
});

export const OnboardLLMResponseSchema = z.object({
    message: z.string(),
});

export const GetLLMConfigRequestSchema = z.object({
    llm_tag: z.string(),
});

export const GetLLMConfigResponseSchema = z.record(z.string(), z.string());

export const DeleteLLMRequestSchema = z.object({
    llm_tag: z.string(),
});

export const DeleteLLMResponseSchema = z.object({
    message: z.string(),
});
