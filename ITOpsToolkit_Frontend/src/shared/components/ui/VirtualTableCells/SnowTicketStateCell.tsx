import type { CellContext } from '@tanstack/react-table';

interface SnowTicketStateCellProps<T> extends CellContext<T, unknown> {
    prefix?: string;
}

const SnowTicketStateCell = <T,>({ getValue }: SnowTicketStateCellProps<T>) => {
    const val = getValue<string>();
    const stateKey = val?.toLowerCase().trim().replace(/\s+/g, '-');
    const stateStyles: Record<string, { background: string; color: string }> = {
        new: { background: '#dcf0d6', color: '#165700' },
        'in-progress': { background: '#bbddff', color: '#011a80' },
        'on-hold': { background: '#ffe5bb', color: '#c65e08' },
        resolved: { background: '#f8dcfc', color: '#9700ad' },
        approved: { background: '#f8dcfc', color: '#9700ad' },
        closed: { background: '#e1bee7', color: '#4a148c' },
        'closed-incomplete': { background: '#e1bee7', color: '#4a148c' },
        assess: { background: '#fbbbe8', color: '#a10d75' },
        'closed-cancelled': { background: '#fbbbe8', color: '#a10d75' },
        pending: { background: '#b2f9ff', color: '#0082e6' },
        'pending-approval': { background: '#b2f9ff', color: '#0082e6' },
        'work-in-progress': { background: '#ffe0b2', color: '#e65100' },
    };
    const style = stateStyles[stateKey] ?? { background: '#f3f4f6', color: '#111827' };
    return (
        <span
            className="inline-flex items-center justify-center rounded-xl px-2 py-0.5 text-[0.6rem] font-semibold capitalize tracking-wide"
            style={{ background: style.background, color: style.color }}
        >
            {val}
        </span>
    );
};

export default SnowTicketStateCell;
