import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import type { BooleanFilterProps } from '../../types';

const BooleanFilter: FC<BooleanFilterProps> = ({ value, onChange, labels = {}, className }) => {
    const allLabel = labels.all ?? 'All';
    const trueLabel = labels.true ?? 'Yes';
    const falseLabel = labels.false ?? 'No';

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        onChange(val === '' ? undefined : val === 'true');
    };

    return (
        <select
            value={value === undefined ? '' : String(value)}
            onChange={handleChange}
            className={twMerge(
                'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                className,
            )}
        >
            <option value="">{allLabel}</option>
            <option value="true">{trueLabel}</option>
            <option value="false">{falseLabel}</option>
        </select>
    );
};

BooleanFilter.displayName = 'VirtualTable.BooleanFilter';
export default BooleanFilter;
