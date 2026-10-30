import type { FC } from 'react';
import { CheckboxInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface CheckboxFieldProps extends BaseFieldProps {
    checkboxLabelClassName?: string;
}

const CheckboxField: FC<CheckboxFieldProps> = ({ value, onChange, onBlur, label, disabled, error, name, inputClassName, checkboxLabelClassName }) => {
    return (
        <CheckboxInput
            name={name}
            checked={!!value}
            onChange={(v) => onChange(v)}
            onBlur={onBlur}
            disabled={disabled}
            error={!!error}
            label={label}
            className={inputClassName}
            labelClassName={checkboxLabelClassName}
        />
    );
};

export default CheckboxField;
