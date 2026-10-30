import type { FC } from 'react';
import { DateInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface DateFieldProps extends BaseFieldProps {
    triggerClassName?: string;
    time?: boolean;
}

const DateField: FC<DateFieldProps> = ({ value, onChange, onBlur, onFocus, disabled, error, inputClassName, triggerClassName, time }) => {
    return (
        <DateInput
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v)}
            onBlur={onBlur}
            onFocus={onFocus}
            disabled={disabled}
            error={!!error}
            className={inputClassName}
            triggerClassName={triggerClassName}
            time={time}
        />
    );
};

export default DateField;
