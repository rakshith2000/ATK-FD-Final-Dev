import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { LiteLLMProxy } from '../types/lite-llm-proxy';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { LiteLLMProxySchema } from '../schemas/lite-llm-proxy.schemas';

const fetchLiteLLMProxyList = async () => {
    return withApiResponseHandler<LiteLLMProxy>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listLiteLLMProxies);

        if (!response?.data?.output?.data) {
            throw new Error('response?.data?.output?.data not found');
        }

        if (!Array.isArray(response.data.output.data) && typeof response.data.output.data === 'object' && Object.keys(response.data.output.data).length === 0) {
            return {} as LiteLLMProxy;
        }

        return await LiteLLMProxySchema.parseAsync(response.data.output.data);
    });
};

export default fetchLiteLLMProxyList;
