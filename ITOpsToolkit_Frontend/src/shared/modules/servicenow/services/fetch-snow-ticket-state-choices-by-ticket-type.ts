import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import type { SnowTableName } from '../types/ticket';
import { getSnowTableNameByTicketType } from '../utils/get-snow-table-by-ticket-type';

export interface TicketFieldChoice {
    sys_id: string;
    label: string;
    value: string;
}

export const fetchSnowTicketFieldChoicesByTikcetType = async ({ ticketType, field }: { ticketType: SnowTableName; field: string }): Promise<Array<TicketFieldChoice>> => {
    return withApiResponseHandler<Array<TicketFieldChoice>>(async () => {
        const snowTableName: string = getSnowTableNameByTicketType(ticketType);

        const response = await serviceNowApiClient.get(appConfig.serviceNow.api.sysChoiceTable, {
            params: {
                sysparm_query: `name=${snowTableName}^element=${field}`,
                sysparm_fields: 'label,value,sys_id',
            },
        });

        if ('result' in response?.data && Array.isArray(response?.data?.['result'])) {
            const choices = response?.data.result;
            return choices;
        } else {
            throw new Error(`Unable to fetch field choices for ${field} from Service Now for ticket type ${ticketType} !`, {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }
    });
};
