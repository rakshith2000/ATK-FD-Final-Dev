import type { FC } from 'react';
import { TextInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps } from '../types';

interface TextFieldProps extends BaseFieldProps {
    multiline?: boolean;
    rows?: number;
    maxLength?: number;
    textareaClassName?: string;
}

const TextField: FC<TextFieldProps> = ({ value, onChange, onBlur, onFocus, placeholder, disabled, error, name, multiline, rows, maxLength, inputClassName, textareaClassName }) => {
    return (
        <TextInput
            name={name}
            value={(value as string) ?? ''}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            disabled={disabled}
            error={!!error}
            rows={rows}
            multiline={multiline}
            maxLength={maxLength}
            showCharCount={maxLength !== undefined}
            className={inputClassName}
            textareaClassName={textareaClassName}
        />
    );
};

export default TextField;
