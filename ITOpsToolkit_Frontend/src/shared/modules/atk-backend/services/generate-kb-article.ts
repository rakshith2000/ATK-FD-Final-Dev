import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { GenerateKBArticleRequest, GenerateKBArticleResponse } from '../types/knowledge-base';
import { isGenereatedKBArticleResponse } from '../type-guards/knowledge-base.guards';

const generateKbArticle = async (payload: GenerateKBArticleRequest) => {
    return withApiResponseHandler<GenerateKBArticleResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.generateKbArticle, {
            ...payload,
        });

        if (response?.data?.output?.data && isGenereatedKBArticleResponse(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to identify the Generated KB Article from API, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default generateKbArticle;
