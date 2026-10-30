import { fasteaiFetch, FASTEAI_LOGS_BASE, FASTEAI_CORE_BASE } from '@/api/axios-clients/fasteai/fasteaiAuth';
import type { ReassignPayload } from './types';

export const reassignAutomationTicket = async (ticketIdOrSysId: string | number, ticketNumber: string, payload: ReassignPayload): Promise<string> => {
    const snowRes = await fasteaiFetch(`${FASTEAI_CORE_BASE}/ticket-orchestration/incident/${ticketIdOrSysId}`, FASTEAI_CORE_BASE, {
        method: 'patch',
        data: {
            assigned_to: payload.assignedTo,
            assignment_group: '',
            work_notes: payload.workNotes,
        },
    });

    if (snowRes.status < 200 || snowRes.status >= 300) {
        throw new Error(`ServiceNow tracking update failure via API gateway (${snowRes.status})`);
    }

    try {
        await fasteaiFetch(`${FASTEAI_LOGS_BASE}/logs`, FASTEAI_CORE_BASE, {
            method: 'post',
            data: {
                number: ticketNumber,
                short_description: payload.shortDescription,
                description: payload.description,
                ticket_category: 'Service Down',
                resolved: 'false',
                escalation_category: ['access issue'],
                escalation_state: 'true',
                dashboard_category: 'Others',
                sop_availability: 'others',
            },
        });
    } catch {}

    try {
        await fasteaiFetch(`${FASTEAI_CORE_BASE}/current-tasks/${ticketNumber}`, FASTEAI_CORE_BASE, { method: 'delete' });
    } catch {}

    return ticketNumber;
};
