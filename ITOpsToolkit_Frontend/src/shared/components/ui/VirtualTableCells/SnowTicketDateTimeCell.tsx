import { formatLocalDate } from '@/shared/utils/format-local-date';
import type { CellContext } from '@tanstack/react-table';

interface SnowTicketDateTimeCellProps<T> extends CellContext<T, unknown> {
    prefix?: string;
}

const SnowTicketDateTimeCell = <T,>({ getValue }: SnowTicketDateTimeCellProps<T>) => {
    const val = getValue<string>();
    const formattedDate = formatLocalDate(val);

    if (!formattedDate) return null;

    return <span>{formattedDate}</span>;
};

export default SnowTicketDateTimeCell;
