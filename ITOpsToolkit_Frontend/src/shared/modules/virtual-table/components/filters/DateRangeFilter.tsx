import type { FC } from 'react';
import { DateRangeInput } from '@/shared/components/ui/InputFields';
import type { DateRangeFilterProps } from '../../types';

const DateRangeFilter: FC<DateRangeFilterProps> = ({ value, onChange, className }) => {
    return <DateRangeInput value={value} onChange={onChange} className={className as string} />;
};

DateRangeFilter.displayName = 'VirtualTable.DateRangeFilter';
export default DateRangeFilter;
