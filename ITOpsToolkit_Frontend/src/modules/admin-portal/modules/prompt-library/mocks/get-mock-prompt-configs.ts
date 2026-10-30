import type { PromptConfiguration } from '../types/prompt-library';

export const getMockPromptConfigs = (count = 1000): PromptConfiguration[] => {
    return Array.from({ length: count }, (_, i) => ({
        identifier: `agent_${i + 1}`,
        description: `This is a mock description for agent ${i + 1}. It describes the purpose and behavior of this particular agent or tool in the system.`,
        instruction: `You are agent ${i + 1}.\n\n**Guidelines:**\n+ Follow all instructions carefully.\n+ Do not hallucinate.\n+ Always return valid JSON.\n+ Preserve factual integrity of the input content.`,
        llm_tag: ['azure_gpt4o', 'gpt-4o', 'azure_gpt35', 'claude-3-opus', 'gemini-pro'][i % 5],
        itsm_tags: i % 3 === 0 ? ['servicenow', 'Platform_SNOW'] : i % 3 === 1 ? ['jira'] : [],
    }));
};
