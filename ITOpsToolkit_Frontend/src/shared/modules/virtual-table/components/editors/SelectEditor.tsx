import type { FC } from 'react';
import { SelectInput } from '@/shared/components/ui/InputFields';
import type { FilterOption } from '../../types';

interface SelectEditorProps {
    value: unknown;
    onChange: (val: unknown) => void;
    onBlur: () => void;
    options: FilterOption[];
    optionsAsync?: (searchTerm: string) => Promise<FilterOption[]>;
    optionsAsyncDebounce?: number;
    placeholder?: string;
    hasError: boolean;
    className?: string;
    onRetry?: () => void;
    onRefetch?: () => void;
}

/** Select editor (delegates to SelectInput) */
const SelectEditor: FC<SelectEditorProps> = ({ value, onChange, onBlur, options, optionsAsync, optionsAsyncDebounce, placeholder, hasError, className, onRetry, onRefetch }) => {
    return (
        <SelectInput
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v)}
            onBlur={onBlur}
            options={options}
            optionsAsync={optionsAsync}
            optionsAsyncDebounce={optionsAsyncDebounce}
            placeholder={placeholder}
            error={hasError}
            triggerClassName={className}
            onRetry={onRetry}
            onRefetch={onRefetch}
        />
    );
};

export default SelectEditor;
