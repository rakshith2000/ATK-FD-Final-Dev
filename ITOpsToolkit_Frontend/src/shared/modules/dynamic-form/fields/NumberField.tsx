import type { FC } from 'react';
import { NumberInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface NumberFieldProps extends BaseFieldProps {
    min?: number;
    max?: number;
}

const NumberField: FC<NumberFieldProps> = ({ value, onChange, onBlur, onFocus, placeholder, disabled, error, name, min, max, inputClassName }) => {
    return (
        <NumberInput
            name={name}
            value={value as number | ''}
            onChange={(v) => onChange(v)}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            disabled={disabled}
            error={!!error}
            min={min}
            max={max}
            className={inputClassName}
        />
    );
};

export default NumberField;
