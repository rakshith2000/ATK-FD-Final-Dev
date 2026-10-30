import { appConfig } from '@/config/app-config';
import { getToken } from '../../../../api/axios-clients/fasteai/fasteaiAuth';
import logger from '@/shared/utils/logger';

const SNOW_TABLE: Record<string, string> = {
    INC: 'incident.do',
    REQ: 'sc_request.do',
    CHG: 'change_request.do',
};

export function getSnowTicketUrl(ticketNumber: string): string {
    const num = ticketNumber.toUpperCase();
    const prefix = Object.keys(SNOW_TABLE).find((p) => num.startsWith(p));
    const table = prefix ? SNOW_TABLE[prefix] : 'task.do';

    logger.debug(`getSnowTicketUrl: ticketNumber=${ticketNumber}, prefix=${prefix}, table=${table}`, appConfig.serviceNow.api.baseUrl);
    return `${appConfig.serviceNow.api.baseUrl}/${table}?sysparm_query=number=${num}`;
}

export function openSnowTicket(ticketNumber: string): void {
    if (!ticketNumber) return;

    const token = getToken();
    if (!token) {
        // eslint-disable-next-line no-console
        console.warn('No authentication token available — user may need to re-authenticate.');
    }

    const url = getSnowTicketUrl(ticketNumber);
    window.open(url, '_blank', 'noopener,noreferrer');
}

export { getToken };
