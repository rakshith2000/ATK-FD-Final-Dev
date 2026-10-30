import type { LLM } from '../types/llms';
import { faker } from '@faker-js/faker';

const llmTypes = ['AWS Nova', 'Azure OpenAI', 'Google Gemini'] as const;
type LLMType = (typeof llmTypes)[number];

const users = [
    'Arjun Reddy',
    'Sai Kiran',
    'Venkat Rao',
    'Naveen Kumar',
    'Charan Teja',
    'Priya Chowdary',
    'Sravani Reddy',
    'Bhargav Naidu',
    'Harsha Vardhan',
    'Lakshmi Prasanna',
    'Karthik Goud',
    'Anusha Devi',
    'Sindhuja Rao',
    'Mahesh Babu',
    'Keerthi Suresh',
    'Ravi Teja',
    'Pavan Kumar',
    'Madhavi Latha',
    'Suresh Babu',
    'Deepthi Nalluri',
];

const mockConfigByType: Record<LLMType, Record<string, string>> = {
    'AWS Nova': {
        AWS_ACCESS_KEY_ID: faker.string.alphanumeric(20),
        AWS_SECRET_ACCESS_KEY: faker.string.alphanumeric(40),
        AWS_REGION_NAME: faker.helpers.arrayElement(['us-east-1', 'ap-south-1', 'eu-west-1']),
    },
    'Azure OpenAI': {
        AZURE_API_KEY: faker.string.alphanumeric(32),
        AZURE_API_BASE: `https://${faker.internet.domainName()}`,
        AZURE_API_VERSION: '2024-02-15-preview',
    },
    'Google Gemini': {
        VERTEX_AI_PROJECT: faker.internet.domainWord(),
        GEMINI_API_KEY: `AIza${faker.string.alphanumeric(30)}`,
    },
};

export const getMockLLMs = (count = 1000): LLM[] => {
    return Array.from({ length: count }, (_, i) => {
        const llm_type = llmTypes[i % llmTypes.length];

        //  UNIQUE + <= 15 chars
        // pattern: 3 chars prefix + 10 random + index suffix (trimmed)
        const rawTag = `${llm_type.slice(0, 3).toLowerCase()}${faker.string.alphanumeric(10)}${i}`;
        const llm_tag = rawTag.slice(0, 15); // enforce max length

        return {
            llm_tag,
            llm_type,
            updated_by: users[i % users.length].replaceAll(' ', '.'),
            llm_config: mockConfigByType[llm_type],
            associated_agents_or_tools: [],
            updated_at: faker.date.recent({ days: 30 }).toISOString(),
        };
    });
};
