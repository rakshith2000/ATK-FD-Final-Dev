import type { Meeting } from '../types/meeting-ai';

export function filterVisibleMeetings(meetings: Meeting[] | null | undefined): Meeting[] {
    return (meetings ?? []).filter((m) => m.auth_required === false);
}
