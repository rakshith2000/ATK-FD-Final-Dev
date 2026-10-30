import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import { appConfig } from '@/config/app-config';
import { isSnowTicketArray } from '@/shared/modules/servicenow/type-guards/ticket.guards';
import type { SnowTicket, SnowTicketField } from '@/shared/modules/servicenow/types/ticket';

export interface ActiveTicketDetail {
    number: string;
    short_description: string;
    description: string;
    priority: string;
    assigned_to: string;
    assignment_group: string;
    cmdb_ci: string;
    state: string;
}

const fieldText = (field: SnowTicketField | undefined): string => {
    if (!field) return '';
    const display = field.display_value ?? field.value ?? '';
    return typeof display === 'string' ? display.trim() : '';
};

const mapTicket = (ticket: SnowTicket): ActiveTicketDetail => ({
    number: fieldText(ticket.number),
    short_description: fieldText(ticket.short_description),
    description: fieldText(ticket.description),
    priority: fieldText(ticket.priority),
    assigned_to: fieldText(ticket.assigned_to),
    assignment_group: fieldText(ticket.assignment_group),
    cmdb_ci: fieldText(ticket.cmdb_ci),
    state: fieldText(ticket.state),
});

export const fetchSnowActiveTicketDetails = async (ticketNumbers: string[]): Promise<Record<string, ActiveTicketDetail>> => {
    return withApiResponseHandler<Record<string, ActiveTicketDetail>>(async () => {
        const uniqueNumbers = Array.from(new Set(ticketNumbers.map((num) => String(num).trim().toUpperCase()).filter((num) => num.length > 0)));

        if (uniqueNumbers.length === 0) {
            return {};
        }
        const query = `numberIN${uniqueNumbers.join(',')}`;
        // sysparm_display_value=all is required so each field comes back as { value, display_value } (what isSnowTicketArray expects)
        // and reference fields (assigned_to, assignment_group, cmdb_ci) resolve to names instead of sys_ids.
        const fields = 'number,short_description,description,priority,assigned_to,assignment_group,cmdb_ci,state';
        const url = `${appConfig.serviceNow.api.incidentTable}?sysparm_display_value=all&sysparm_fields=${fields}&sysparm_query=${encodeURIComponent(query)}`;

        const response = await serviceNowApiClient.get(url);

        if (!('result' in response?.data) || !isSnowTicketArray(response.data['result'])) {
            throw new Error('Failed to fetch active incident details from ServiceNow !', {
                cause: {
                    reason: 'response?.data?.result schema is invalid!',
                },
            });
        }

        const detailMap: Record<string, ActiveTicketDetail> = {};
        for (const ticket of response.data['result']) {
            const detail = mapTicket(ticket);
            if (detail.number) {
                detailMap[detail.number.toUpperCase()] = detail;
            }
        }

        return detailMap;
    });
};
