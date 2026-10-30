import type { ProblemStatusFilter } from '../constants/problem-status-filter-options';
import type { ProblemTicket } from '../types/problem-ai';
import formatRecLabel from './format-rec-label';

interface FilterArgs {
    tickets: ProblemTicket[] | undefined | null;
    status: ProblemStatusFilter;
    search: string;
}

const filterProblemTickets = ({ tickets, status, search }: FilterArgs): ProblemTicket[] => {
    const source = tickets ?? [];
    const q = search.toLowerCase().trim();
    const statusLower = status.toLowerCase();

    return source.filter((t) => {
        const matchesStatus = (t?.approval_status ?? '').toLowerCase().includes(statusLower);
        if (!q) return matchesStatus;

        const searchableFields: Array<string | null | undefined> = [
            t?.short_description,
            t?.assigned_to ?? 'None',
            t?.problem_ticket_number,
            t?.approval_status,
            t?.state,
            t?.id ? formatRecLabel(t.id) : '',
        ];

        const matchesSearch = searchableFields.some((field) =>
            String(field ?? '')
                .toLowerCase()
                .includes(q),
        );
        return matchesStatus && matchesSearch;
    });
};

export default filterProblemTickets;
