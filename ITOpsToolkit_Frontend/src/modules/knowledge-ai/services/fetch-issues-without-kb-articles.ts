import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import { isIssueWithoutKBArray } from '../type-guards';
import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';

const fetchIssuesWithoutKbArticless = async () => {
    return withApiResponseHandler<Array<IssueWithoutKBArticle>>(async () => {
        const response = await backendApiClient.get(appConfig.backend.api.listIssuesWithoutKbArticles);

        if (response?.data?.output?.data && isIssueWithoutKBArray(response?.data?.output?.data)) {
            return response?.data?.output?.data;
        } else {
            throw new Error('Unable to retrive the issues without KB"s from API response, failed to validate response JSON Schema !', {
                cause: {
                    reason: 'response?.data?.output?.data schemea is invalid !',
                },
            });
        }
    });
};

export default fetchIssuesWithoutKbArticless;
