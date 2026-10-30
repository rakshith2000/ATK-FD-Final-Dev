import type { FC } from 'react';
import { NumberRangeInput } from '@/shared/components/ui/InputFields';
import type { NumberRangeValue } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface NumberRangeFieldProps extends BaseFieldProps {
    min?: number;
    max?: number;
    step?: number;
}

const NumberRangeField: FC<NumberRangeFieldProps> = ({ value, onChange, onFocus, disabled, error, min, max, step, inputClassName }) => {
    const rangeValue: NumberRangeValue = Array.isArray(value) ? (value as NumberRangeValue) : [undefined, undefined];

    return (
        <NumberRangeInput
            value={rangeValue}
            onChange={(newValue) => onChange(newValue)}
            onFocus={onFocus}
            disabled={disabled}
            error={!!error}
            min={min}
            max={max}
            step={step}
            className={inputClassName}
        />
    );
};

export default NumberRangeField;
