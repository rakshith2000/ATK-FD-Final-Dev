import type { FC } from 'react';
import { MultiSelectInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps, SelectOption } from '../types';

interface MultiSelectFieldProps extends BaseFieldProps {
    options: SelectOption[];
    isLoading?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
    onRefetch?: () => void;
    triggerClassName?: string;
    chipClassName?: string;
    chipDeleteClassName?: string;
    optionsAsync?: (searchTerm: string) => Promise<SelectOption[]>;
    optionsAsyncDebounce?: number;
}

const MultiSelectField: FC<MultiSelectFieldProps> = ({
    value,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    disabled,
    error,
    options,
    isLoading,
    errorMessage,
    onRetry,
    onRefetch,
    inputClassName,
    triggerClassName,
    chipClassName,
    chipDeleteClassName,
    optionsAsync,
    optionsAsyncDebounce,
}) => {
    return (
        <MultiSelectInput
            value={
                Array.isArray(value)
                    ? (value as string[])
                    : typeof value === 'string' && value
                      ? value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                      : []
            }
            maxChips={1}
            onChange={(v) => onChange(v)}
            onBlur={onBlur}
            onFocus={onFocus}
            options={options}
            placeholder={placeholder ?? 'Select...'}
            disabled={disabled}
            error={!!error}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onRetry={onRetry}
            onRefetch={onRefetch}
            className={inputClassName}
            triggerClassName={triggerClassName}
            chipClassName={chipClassName}
            chipDeleteClassName={chipDeleteClassName}
            optionsAsync={optionsAsync}
            optionsAsyncDebounce={optionsAsyncDebounce}
        />
    );
};

export default MultiSelectField;
