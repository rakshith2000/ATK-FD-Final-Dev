import type { FC } from 'react';
import { SelectInput } from '@/shared/components/ui/InputFields';
import type { BaseFieldProps, SelectOption } from '../types';

interface SelectFieldProps extends BaseFieldProps {
    options: SelectOption[];
    isLoading?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
    onRefetch?: () => void;
    triggerClassName?: string;
    optionsAsync?: (searchTerm: string) => Promise<SelectOption[]>;
    optionsAsyncDebounce?: number;
}

const SelectField: FC<SelectFieldProps> = ({
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
    optionsAsync,
    optionsAsyncDebounce,
}) => {
    return (
        <SelectInput
            value={(value as string) ?? ''}
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
            optionsAsync={optionsAsync}
            optionsAsyncDebounce={optionsAsyncDebounce}
        />
    );
};

export default SelectField;
