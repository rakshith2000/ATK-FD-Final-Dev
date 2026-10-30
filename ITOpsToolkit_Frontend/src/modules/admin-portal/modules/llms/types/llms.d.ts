import type { z } from 'zod';
import type {
    LLMSchema,
    LLMTsListResponseSchema,
    OnboardLLMRequestSchema,
    OnboardLLMResponseSchema,
    GetLLMConfigRequestSchema,
    GetLLMConfigResponseSchema,
    DeleteLLMRequestSchema,
    DeleteLLMResponseSchema,
} from '../schemas/llm.schemas';

// LLM -> Large Language Model
// Get the list of LLM's -> Array<LLM>;
export type LLM = z.infer<typeof LLMSchema>;

export type LLMTsListResponse = z.infer<typeof LLMTsListResponseSchema>;

// Create are new LLM
export type OnboardLLMRequest = z.infer<typeof OnboardLLMRequestSchema>;

export type OnboardLLMResponse = z.infer<typeof OnboardLLMResponseSchema>;

// Each LLM configuration details
export type GetLLMConfigRequest = z.infer<typeof GetLLMConfigRequestSchema>;

export type GetLLMConfigRespone = z.infer<typeof GetLLMConfigResponseSchema>;

// Delete an LLM
export type DeleteLLMRequest = z.infer<typeof DeleteLLMRequestSchema>;

export type DeleteLLMResponse = z.infer<typeof DeleteLLMResponseSchema>;
