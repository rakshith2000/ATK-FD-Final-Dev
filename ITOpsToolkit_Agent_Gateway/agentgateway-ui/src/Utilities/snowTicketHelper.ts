import { getApiConfig } from './config';
import { getToken } from '../../api/fasteaiAuth';

const SNOW_TABLE: Record<string, string> = {
  INC: 'incident.do',
  REQ: 'sc_request.do',
  CHG: 'change_request.do',
};

function getSnowTicketUrl(ticketNumber: string): string {
  const cfg = getApiConfig();
  const baseUrl = (cfg?.servicenow_baseurl as string | undefined)?.replace(/\/$/, '') ?? '';
  const num = ticketNumber?.toUpperCase() ?? '';
  const prefix = Object.keys(SNOW_TABLE).find((p) => num.startsWith(p));
  const table = prefix ? SNOW_TABLE[prefix] : 'task.do';
  return `${baseUrl}/${table}?sysparm_query=number=${num}`;
}

export function openSnowTicket(ticketNumber: string): void {
  if (!ticketNumber) return;
  // getToken() returns the live Keycloak bearer token from Redux / sessionStorage.
  // It is available here for any authenticated backend calls; direct portal
  // navigation relies on the browser's existing ServiceNow SSO session.
  const token = getToken();
  if (!token) {
    console.warn('No Keycloak token available — user may need to re-authenticate.');
  }
  const url = getSnowTicketUrl(ticketNumber);
  window.open(url, '_blank', 'noopener,noreferrer');
}
