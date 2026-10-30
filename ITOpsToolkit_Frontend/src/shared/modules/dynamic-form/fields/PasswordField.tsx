import type { FC } from 'react';
import { PasswordInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface PasswordFieldProps extends BaseFieldProps {
    maxLength?: number;
}

const PasswordField: FC<PasswordFieldProps> = ({ value, onChange, onBlur, onFocus, placeholder, disabled, error, name, maxLength, inputClassName }) => {
    return (
        <PasswordInput
            name={name}
            value={(value as string) ?? ''}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            disabled={disabled}
            error={!!error}
            maxLength={maxLength}
            showCharCount={maxLength !== undefined}
            className={inputClassName}
        />
    );
};

export default PasswordField;
