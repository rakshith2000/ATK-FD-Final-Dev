import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { TextInput, NumberInput, DateInput } from '@/shared/components/ui/InputFields';
import { INPUT_ERROR } from './editor-styles';

interface InputEditorProps {
    type: 'text' | 'number' | 'date';
    value: unknown;
    onChange: (val: unknown) => void;
    onBlur: () => void;
    placeholder?: string;
    hasError: boolean;
    className?: string;
}

/** Text / Number / Date input editor */
const InputEditor: FC<InputEditorProps> = ({ type, value, onChange, onBlur, placeholder, hasError, className }) => {
    const errorClass = hasError ? INPUT_ERROR : undefined;

    if (type === 'number') {
        return (
            <NumberInput
                value={value === null || value === undefined || value === '' ? undefined : Number(value)}
                onChange={(v) => onChange(v === undefined ? '' : v)}
                onBlur={onBlur}
                placeholder={placeholder}
                error={hasError}
                className={twMerge(errorClass, className)}
            />
        );
    }

    if (type === 'date') {
        return (
            <DateInput
                value={value === null || value === undefined ? '' : String(value)}
                onChange={(v) => onChange(v)}
                onBlur={onBlur}
                error={hasError}
                className={twMerge(errorClass, className)}
            />
        );
    }

    return (
        <TextInput
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(v) => onChange(v)}
            onBlur={onBlur}
            placeholder={placeholder}
            error={hasError}
            className={twMerge(errorClass, className)}
        />
    );
};

export default InputEditor;
