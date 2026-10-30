import type { FC } from 'react';
import { NumberRangeInput } from '@/shared/components/ui/InputFields';
import type { NumberRangeFilterProps } from '../../types';

const NumberRangeFilter: FC<NumberRangeFilterProps> = ({ value, onChange, placeholder = ['Min', 'Max'], className }) => {
    return <NumberRangeInput value={value} onChange={onChange} placeholder={placeholder} className={className as string} />;
};

NumberRangeFilter.displayName = 'VirtualTable.NumberRangeFilter';
export default NumberRangeFilter;
