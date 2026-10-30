import type { GetToolkitPackageConfigResponse, PromptConfiguration } from '../types/prompt-library';

const isPromptConfiguration = (value: unknown): value is PromptConfiguration => {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
        typeof obj.description === 'string' &&
        typeof obj.instruction === 'string' &&
        (typeof obj.llm_tag === 'string' || obj.llm_tag === null || obj.llm_tag === undefined) &&
        (Array.isArray(obj.itsm_tags) ? obj.itsm_tags.every((t) => typeof t === 'string') : obj.itsm_tags === null || obj.itsm_tags === undefined)
    );
};

export const isGetToolkitPackageConfigResponse = (value: unknown): value is GetToolkitPackageConfigResponse => {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;

    // Validate package_configs
    if (typeof obj.package_configs !== 'object' || obj.package_configs === null) return false;
    const pkgConfig = obj.package_configs as Record<string, unknown>;
    if (typeof pkgConfig.llm_tag !== 'string') return false;
    if (!Array.isArray(pkgConfig.itsm_tags) || !pkgConfig.itsm_tags.every((t) => typeof t === 'string')) return false;
    if (!Array.isArray(pkgConfig.llm_guards) || !pkgConfig.llm_guards.every((t) => typeof t === 'string')) return false;

    // Validate prompts
    if (typeof obj.prompts !== 'object' || obj.prompts === null) return false;
    const prompts = obj.prompts as Record<string, unknown>;
    return Object.values(prompts).every(isPromptConfiguration);
};
