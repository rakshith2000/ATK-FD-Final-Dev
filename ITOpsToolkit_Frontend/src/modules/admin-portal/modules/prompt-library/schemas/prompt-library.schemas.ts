import { z } from 'zod';

export const PackageConfigurationSchema = z.object({
    llm_tag: z.string(),
    itsm_tags: z.array(z.string()),
    llm_guards: z.array(z.string()),
});

export const PromptConfigurationSchema = z.object({
    description: z.string(),
    instruction: z.string(),
    llm_tag: z.string().nullable().optional(),
    itsm_tags: z.array(z.string()).nullable().optional(),
});

export const GetToolkitPackageConfigRequestSchema = z.object({
    package_name: z.string(),
});

export const GetToolkitPackageConfigResponseSchema = z.object({
    package_configs: PackageConfigurationSchema,
    prompts: z.record(z.string(), PromptConfigurationSchema),
});

export const UpdatePromptConfigRequestSchema = z.object({
    package_name: z.string(),
    agent_or_tool_name: z.string(),
    description: z.string(),
    instruction: z.string(),
    llm_tag: z.string().nullable(),
    itsm_tags: z.array(z.string()).nullable(),
});

export const UpdatePromptConfigResponseSchema = z.object({
    message: z.string(),
});

export const UpdateToolkitPackageConfigRequestSchema = z.object({
    package_name: z.string(),
    llm_tag: z.string(),
    llm_guards: z.array(z.string()),
    itsm_tags: z.array(z.string()),
});

export const UpdateToolkitPackageConfigResponseSchema = z.object({
    message: z.string(),
});

export const UpdateModuleConfigurationRequestSchema = z.object({
    module: z.string(),
    parameter: z.string(),
    value: z.string(),
});

export const UpdateModuleConfigurationResponseSchema = z.object({
    message: z.string(),
});

export const OnboardModuleConfigurationRequestSchema = UpdateModuleConfigurationRequestSchema;

export const OnboardModuleConfigurationResponseSchema = z.object({
    message: z.string(),
});

export const GetModuleConfigsRequestSchema = z.object({
    module: z.string(),
    parameter: z.string(),
});

export const ModuleConfigSchema = z.object({
    module: z.string(),
    parameter: z.string(),
    value: z.string(),
});

export const GetModuleConfigsResponseSchema = z.object({
    data: z.array(ModuleConfigSchema),
    message: z.string(),
});
