import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { GenerateKBArticleResponse } from '../../../shared/modules/atk-backend/types/knowledge-base';
import { isConvertToHtmlResponse } from '../type-guard/meeting-ai.guard';
import type { ConvertToHtmlRequest } from '../types/meeting-ai';

const convertToHtml = async (payload: ConvertToHtmlRequest) => {
    return withApiResponseHandler<GenerateKBArticleResponse>(async () => {
        const response = await backendApiClient.post(appConfig.backend.api.meeting_convert_to_html, {
            ...payload,
        });

        if (response?.data?.output?.data && isConvertToHtmlResponse(response?.data?.output?.data)) {
            const { title, converted_article } = response.data.output.data;
            return { title, generated_article: converted_article };
        } else {
            throw new Error('Unable to convert article to HTML from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default convertToHtml;
