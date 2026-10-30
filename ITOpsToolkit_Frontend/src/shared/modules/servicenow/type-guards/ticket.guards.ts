import type { SnowTicket, SnowTicketField } from '../types/ticket';

function isSnowTicketField(value: unknown): value is SnowTicketField {
    return typeof value === 'object' && value !== null && 'display_value' in value && 'value' in value;
}

function isSnowTicket(value: unknown): value is SnowTicket {
    return typeof value === 'object' && value !== null && Object.values(value).every(isSnowTicketField);
}

export function isSnowTicketArray(value: unknown): value is Array<SnowTicket> {
    return Array.isArray(value) && value.every(isSnowTicket);
}
