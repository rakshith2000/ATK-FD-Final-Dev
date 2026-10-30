import type { z } from 'zod';
import type {
    PromptConfigurationSchema,
    GetToolkitPackageConfigRequestSchema,
    GetToolkitPackageConfigResponseSchema,
    UpdatePromptConfigRequestSchema,
    UpdatePromptConfigResponseSchema,
    UpdateToolkitPackageConfigRequestSchema,
    UpdateToolkitPackageConfigResponseSchema,
    UpdateModuleConfigurationRequestSchema,
    UpdateModuleConfigurationResponseSchema,
    OnboardModuleConfigurationRequestSchema,
    OnboardModuleConfigurationResponseSchema,
    GetModuleConfigsRequestSchema,
    GetModuleConfigsResponseSchema,
} from '../schemas/prompt-library.schemas';
interface PackageConfiguration {
    llm_tag: string;
    itsm_tags: string[];
    llm_guards: string[];
}

export type PromptConfiguration = z.infer<typeof PromptConfigurationSchema>;

export type GetToolkitPackageConfigRequest = z.infer<typeof GetToolkitPackageConfigRequestSchema>;

export type GetToolkitPackageConfigResponse = z.infer<typeof GetToolkitPackageConfigResponseSchema>;

export type UpdatePromptConfigRequest = z.infer<typeof UpdatePromptConfigRequestSchema>;

export type UpdatePromptConfigResponse = z.infer<typeof UpdatePromptConfigResponseSchema>;

export type UpdateToolkitPackageConfigRequest = z.infer<typeof UpdateToolkitPackageConfigRequestSchema>;

export type UpdateToolkitPackageConfigResponse = z.infer<typeof UpdateToolkitPackageConfigResponseSchema>;

export type UpdateModuleConfigurationRequest = z.infer<typeof UpdateModuleConfigurationRequestSchema>;

export type UpdateModuleConfigurationResponse = z.infer<typeof UpdateModuleConfigurationResponseSchema>;

export type OnboardModuleConfigurationRequest = z.infer<typeof OnboardModuleConfigurationRequestSchema>;

export type OnboardModuleConfigurationResponse = z.infer<typeof OnboardModuleConfigurationResponseSchema>;

export type GetModuleConfigsRequest = z.infer<typeof GetModuleConfigsRequestSchema>;

export type GetModuleConfigsResponse = z.infer<typeof GetModuleConfigsResponseSchema>;
