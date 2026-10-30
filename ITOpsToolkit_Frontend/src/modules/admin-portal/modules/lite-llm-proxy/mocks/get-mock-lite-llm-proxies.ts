import type { LiteLLMProxy } from '../types/lite-llm-proxy';
import { faker } from '@faker-js/faker';

export const getMockLiteLLMProxies = (count = 100): LiteLLMProxy[] => {
    return Array.from({ length: count }, () => ({
        proxy_base_url: `https://${faker.internet.domainName()}`,

        proxy_key: `sk-${faker.string.alphanumeric(32)}`,

        updated_by: faker.helpers.arrayElement(['itopsui.dev']).replaceAll(' ', '.'),

        updated_at: faker.date.recent({ days: 30 }).toISOString(),
    }));
};
