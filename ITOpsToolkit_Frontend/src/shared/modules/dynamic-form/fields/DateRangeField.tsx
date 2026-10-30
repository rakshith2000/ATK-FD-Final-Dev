import type { FC } from 'react';
import { DateRangeInput } from '@/shared/components/ui/InputFields';
import type { DateRangeValue } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface DateRangeFieldProps extends BaseFieldProps {
    triggerClassName?: string;
}

const DateRangeField: FC<DateRangeFieldProps> = ({ value, onChange, onFocus, disabled, error, inputClassName, triggerClassName }) => {
    const rangeValue: DateRangeValue = Array.isArray(value) ? (value as DateRangeValue) : [undefined, undefined];

    return (
        <DateRangeInput
            value={rangeValue}
            onChange={(newValue) => onChange(newValue)}
            onFocus={onFocus}
            disabled={disabled}
            error={!!error}
            className={inputClassName}
            triggerClassName={triggerClassName}
        />
    );
};

export default DateRangeField;
