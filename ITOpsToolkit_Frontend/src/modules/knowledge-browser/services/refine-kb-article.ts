import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

/**
 * Refines a knowledge article via the shared backend endpoint
 * (`/knowledge_assist/api/v1/refine_kb_article/`). Same request body
 * (`{ kb_article }`) and response contract as the Knowledge AI refine flow;
 * duplicated here so the knowledge-browser module stays self-contained.
 */
const refineKbArticle = async ({ kb_article }: { kb_article: string }) => {
    return withApiResponseHandler<string>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.refineKbArticle, {
            kb_article,
        });

        if (response?.data?.output?.data && typeof response?.data?.output?.data === 'string') {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to get the refined KB Article from API, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schema is invalid !',
                },
            });
        }
    });
};

export default refineKbArticle;
