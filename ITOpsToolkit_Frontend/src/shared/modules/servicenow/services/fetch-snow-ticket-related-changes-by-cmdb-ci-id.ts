import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface RelatedChange {
    severity: {
        display_value: string;
        value: string;
    };
    number: {
        display_value: string;
        value: string;
    };
    short_description: {
        display_value: string;
        value: string;
    };
    opened_at: {
        display_value: string;
        value: string;
    };
    sys_id: {
        display_value: string;
        value: string;
    };
    state: {
        display_value: string;
        value: string;
    };
    priority: {
        display_value: string;
        value: string;
    };
}

export const fetchSnowTicketRelatedChangesByCmdbCiId = async ({ cmdbCiId }: { cmdbCiId?: string | null }): Promise<Array<RelatedChange>> => {
    return withApiResponseHandler<Array<RelatedChange>>(async () => {
        if (!cmdbCiId || cmdbCiId.trim().length <= 0) {
            throw new Error('No Configuration Item (CI) available for the selected ticket !', {
                cause: {
                    cmdbCiId,
                },
            });
        }

        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.ticketRelatedChangesByTicketCmdbCiId.replaceAll(/<CMDB_CI_ID_PLACEHOLDER>/g, String(cmdbCiId)));

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            const choices = response?.data.result;
            return choices;
        } else {
            throw new Error(`Unable to fetch related changes!`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
