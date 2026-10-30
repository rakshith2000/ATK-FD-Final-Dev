import { z } from 'zod';
import { ticketSchema, reassignPayloadSchema, type Ticket, type ReassignPayload } from '../services/types';
import type { ExtendedTicket } from '../components/smart/FasteActiveTickets/FasteActiveTickets';

export const extendedTicketSchema = ticketSchema.extend({
    priority: z.union([z.string(), z.number()]).optional(),
});

export const fasteTicketArraySchema = z.array(ticketSchema);

export function isFasteTicket(value: unknown): value is Ticket {
    return ticketSchema.safeParse(value).success;
}

export function isFasteTicketArray(value: unknown): value is Ticket[] {
    return fasteTicketArraySchema.safeParse(value).success;
}

export function isExtendedTicket(value: unknown): value is ExtendedTicket {
    return extendedTicketSchema.safeParse(value).success;
}

export function isReassignPayload(value: unknown): value is ReassignPayload {
    return reassignPayloadSchema.safeParse(value).success;
}

export function isFlagTrue(value: boolean | string | undefined | null): value is true | 'true' | 'TRUE' {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value === true;
    return value.toLowerCase().trim() === 'true';
}
