import { appConfig } from '@/config/app-config';
import type { SnowTableName } from '../types/ticket';

export const getSnowTableEndpointByTicketType = (ticketType: SnowTableName): string => {
    switch (ticketType) {
        case 'incident':
            return appConfig.serviceNow.api.incidentTable;
        case 'problem':
            return appConfig.serviceNow.api.problemTable;
        case 'sc_request':
            return appConfig.serviceNow.api.scRequestTable;
        case 'kb_knowledge':
            return appConfig.serviceNow.api.knowledgeTable;
        case 'change_request':
            return appConfig.serviceNow.api.changeRequestTable;
        default:
            throw new Error(`Unsupported ticket type for func:getSnowTableEndpointByTicketType : ${ticketType}`);
    }
};

export const getSnowTableNameByTicketType = (ticketType: SnowTableName): string => {
    const endpoint = getSnowTableEndpointByTicketType(ticketType);
    const match = endpoint.match(/\/table\/([a-zA-Z0-9_]+)/);

    if (match && match[1]) {
        return match[1];
    }

    throw new Error(`Failed to extract table name from endpoint for ticket type: ${ticketType} - func:getSnowTableNameByTicketType,`);
};
