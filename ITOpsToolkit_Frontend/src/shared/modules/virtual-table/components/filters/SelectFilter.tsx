import type { FC } from 'react';
import { SelectInput, MultiSelectInput } from '@/shared/components/ui/InputFields';
import type { SelectFilterProps } from '../../types';

const SelectFilter: FC<SelectFilterProps> = ({ value, onChange, options, optionsAsync, optionsAsyncDebounce, multiple = false, placeholder, className, onRetry, onRefetch }) => {
    if (multiple) {
        return (
            <MultiSelectInput
                value={value as string[]}
                onChange={(v) => onChange(v)}
                options={options}
                optionsAsync={optionsAsync}
                optionsAsyncDebounce={optionsAsyncDebounce}
                placeholder={placeholder}
                className={className as string}
                onRetry={onRetry}
                onRefetch={onRefetch}
            />
        );
    }

    return (
        <SelectInput
            value={value as string}
            onChange={(v) => onChange(v)}
            options={options}
            optionsAsync={optionsAsync}
            optionsAsyncDebounce={optionsAsyncDebounce}
            placeholder={placeholder}
            className={className as string}
            onRetry={onRetry}
            onRefetch={onRefetch}
        />
    );
};

SelectFilter.displayName = 'VirtualTable.SelectFilter';
export default SelectFilter;
