import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';

export interface RelatedIncident {
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

export const fetchSnowTicketRelatedIncidentsByCmdbCiId = async ({
    cmdbCiId,
    currentTicketSysId,
}: {
    cmdbCiId?: string | null;
    currentTicketSysId: string | null;
}): Promise<Array<RelatedIncident>> => {
    return withApiResponseHandler<Array<RelatedIncident>>(async () => {
        if (!cmdbCiId || cmdbCiId.trim().length <= 0) {
            throw new Error('No Configuration Item (CI) available for the selected ticket !', {
                cause: {
                    cmdbCiId,
                },
            });
        }

        const response = await serviceNowApiClient.get(
            appConfig.serviceNow.api.ticketRelatedIncidentsByTicketCmdbCiId
                .replaceAll(/<CMDB_CI_ID_PLACEHOLDER>/g, String(cmdbCiId))
                .replaceAll(/<CURRENT_TICKET_SYSID>/g, String(currentTicketSysId)),
        );

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            const choices = response?.data.result;
            return choices;
        } else {
            throw new Error(`Unable to fetch related incidents!`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
