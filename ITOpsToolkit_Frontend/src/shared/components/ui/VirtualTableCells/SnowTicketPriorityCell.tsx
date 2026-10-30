import type { CellContext } from '@tanstack/react-table';

interface SnowTicketPriorityCellProps<T> extends CellContext<T, unknown> {
    prefix?: string;
}

const SnowTicketPriorityCell = <T,>({ getValue, prefix = 'P' }: SnowTicketPriorityCellProps<T>) => {
    const val = getValue<string>();
    const level = val?.charAt(0);
    const priorityStyles: Record<string, { background: string; color: string }> = {
        '1': { background: '#ffdada', color: '#b71c1c' },
        '2': { background: '#ffefc8', color: '#8b5e00' },
        '3': { background: '#ffdb58', color: '#5d4037' },
        '4': { background: '#d4f0c8', color: '#2e7d32' },
        '5': { background: '#c8f0d4', color: '#1b5e20' },
    };
    const style = priorityStyles[level] ?? {};
    return (
        <span
            className="inline-flex items-center justify-center rounded-xl px-2 py-0.5 text-[0.60rem] font-semibold tracking-wide"
            style={{ background: style.background, color: style.color }}
        >
            {prefix}
            {val}
        </span>
    );
};

export default SnowTicketPriorityCell;
