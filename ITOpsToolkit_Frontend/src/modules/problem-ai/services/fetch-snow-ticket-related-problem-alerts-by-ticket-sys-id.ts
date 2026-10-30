import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface RelatedAlert {
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
    source: {
        display_value: string;
        value: string;
    };
}

export const fetchSnowTicketRelatedProblemAlertsByTicketSysId = async ({ ticketId }: { ticketId?: string }): Promise<Array<RelatedAlert>> => {
    return withApiResponseHandler<Array<RelatedAlert>>(async () => {
        if (!ticketId || ticketId.trim().length <= 0) {
            throw new Error('No sys_id available for this ticket !', {
                cause: {
                    ticketId,
                },
            });
        }
        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.ticketRelatedProblemAlertsByTicketSysId.replaceAll(/<SYS_ID_PLACEHOLDER>/g, String(ticketId)));

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            const choices = response?.data.result;
            return choices;
        } else {
            throw new Error(`Unable to fetch related alerts !`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
