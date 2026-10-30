const STORAGE_KEY = 'faste-ticket-snapshots';
const MAX_SNAPSHOTS = 300;

export interface TicketSnapshot {
    number: string;
    fields: Record<string, string>;
    runningSeconds: number | null;
    tokensUsed: number | null;
    lastStep: string;
    completedAt: number;
}

const readAll = (): Record<string, TicketSnapshot> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, TicketSnapshot>) : {};
    } catch {
        return {};
    }
};

export const getTicketSnapshot = (ticketNumber: string): TicketSnapshot | null => readAll()[ticketNumber.trim().toUpperCase()] ?? null;

export const saveTicketSnapshot = (snapshot: TicketSnapshot): void => {
    try {
        const all = readAll();
        const key = snapshot.number.trim().toUpperCase();
        const existing = all[key];
        if (existing && JSON.stringify({ ...existing, completedAt: 0 }) === JSON.stringify({ ...snapshot, completedAt: 0 })) return;
        all[key] = { ...snapshot, completedAt: existing?.completedAt ?? snapshot.completedAt };

        const keys = Object.keys(all);
        if (keys.length > MAX_SNAPSHOTS) {
            keys.sort((a, b) => all[a].completedAt - all[b].completedAt)
                .slice(0, keys.length - MAX_SNAPSHOTS)
                .forEach((k) => delete all[k]);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
};
