import { fasteaiFetch, FASTEAI_LOGS_BASE, FASTEAI_CORE_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import { isFasteTicketArray } from '../typeguard/fasteai-type-guards';
import type { Ticket } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const normalizeStringList = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const values = value.filter((item): item is string => typeof item === 'string');
    return values.length > 0 ? values : undefined;
};

const normalizeTicket = (raw: unknown): Ticket => {
    const ticket = isRecord(raw) ? raw : {};
    const asId = (value: unknown): string | number | undefined => (typeof value === 'string' || typeof value === 'number' ? value : undefined);
    const asFlag = (value: unknown): boolean | string | undefined => (typeof value === 'boolean' || typeof value === 'string' ? value : undefined);

    return {
        id: asId(ticket.id ?? ticket.ticketid),
        ticket_id: asId(ticket.ticket_id ?? ticket.ticketid ?? ticket.id),
        number: String(ticket.number ?? ''),
        created_on: typeof ticket.created_on === 'string' ? ticket.created_on : typeof ticket.createdon === 'string' ? ticket.createdon : undefined,
        resolved: asFlag(ticket.resolved),
        escalation_state: asFlag(ticket.escalation_state ?? ticket.escalationstate),
        dashboard_category:
            typeof ticket.dashboard_category === 'string' ? ticket.dashboard_category : typeof ticket.dashboardcategory === 'string' ? ticket.dashboardcategory : undefined,
        ticket_category: typeof ticket.ticket_category === 'string' ? ticket.ticket_category : typeof ticket.ticketcategory === 'string' ? ticket.ticketcategory : undefined,
        escalation_category: normalizeStringList(ticket.escalation_category ?? ticket.escalationcategory),
        short_description:
            typeof ticket.short_description === 'string' ? ticket.short_description : typeof ticket.shortdescription === 'string' ? ticket.shortdescription : undefined,
        description: typeof ticket.description === 'string' ? ticket.description : undefined,
        assignment_group: typeof ticket.assignment_group === 'string' ? ticket.assignment_group : typeof ticket.assignmentgroup === 'string' ? ticket.assignmentgroup : undefined,
        assigned_to: typeof ticket.assigned_to === 'string' ? ticket.assigned_to : typeof ticket.assignedto === 'string' ? ticket.assignedto : undefined,
        cmdb_ci: typeof ticket.cmdb_ci === 'string' ? ticket.cmdb_ci : typeof ticket.cmdbci === 'string' ? ticket.cmdbci : undefined,
        priority: typeof ticket.priority === 'string' || typeof ticket.priority === 'number' ? ticket.priority : undefined,
    };
};

export const fetchOperationalLogs = async (): Promise<Ticket[]> => {
    const response = await fasteaiFetch(`${FASTEAI_LOGS_BASE}/logs`, FASTEAI_CORE_BASE);

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to retrieve automated logging vectors (${response.status})`);
    }

    const data: unknown = response.data;
    const rawList = Array.isArray(data) ? data : isRecord(data) ? (Array.isArray(data.result) ? data.result : Array.isArray(data.data) ? data.data : []) : [];

    const normalizedList = rawList.map(normalizeTicket);

    if (isFasteTicketArray(normalizedList)) {
        return normalizedList;
    }

    return [];
};
