import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import type { KBArticleScoringRequest, KBArticleScoringResponse } from '../types/knowledge-base';
import { appConfig } from '@/config/app-config';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { KbArticleAIScoringSchema } from '../schemas/knowledge-base.schema';
// import { sleep } from '@/shared/utils/sleep';
// import SAMPLE_KB_AI_SCORE_RESPONSE from '../mocks/SAMPLE_KB_AI_SCORE_RESPONSE';

export const getKbArticleAIScroing = async ({ payload }: { payload: KBArticleScoringRequest }): Promise<KBArticleScoringResponse> => {
    return withApiResponseHandler<KBArticleScoringResponse>(async () => {
        // await sleep(5000);

        // return SAMPLE_KB_AI_SCORE_RESPONSE;

        let endpoint = '';
        let apiPayload = {};

        if (payload.getScoreBy === 'content') {
            endpoint = appConfig.backend.api?.kbAiScoreByContent;
            apiPayload = { kb_article_content: payload.KBContent };
        }

        if (payload.getScoreBy === 'number') {
            endpoint = appConfig.backend.api?.kbAiScoreByNumber;
            apiPayload = { kb_article_number: payload.KBNumber };
        }

        const response = await backendApiClient.post(endpoint, { ...apiPayload });

        const resData = response?.data?.output?.data;

        if (!resData) {
            throw new Error('response?.data?.output?.data not found in response');
        }

        if (payload.getScoreBy === 'number') {
            if (Array.isArray(resData)) {
                if (!!resData?.[0]) {
                    return await KbArticleAIScoringSchema.parseAsync(resData[0]);
                } else {
                    throw new Error(`AI Score not found for KB Number: ${payload.KBNumber}`);
                }
            }
            throw new Error(`response?.data?.output?.data expected an Array of scores but received ${typeof resData}`);
        }

        return await KbArticleAIScoringSchema.parseAsync(resData);
    });
};
