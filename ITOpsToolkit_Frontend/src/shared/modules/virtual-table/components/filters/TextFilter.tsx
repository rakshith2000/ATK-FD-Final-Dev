import { type FC, useState, useEffect } from 'react';
import { TextInput } from '@/shared/components/ui/InputFields';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';
import type { TextFilterProps } from '../../types';

const TextFilter: FC<TextFilterProps> = ({ value, onChange, placeholder = 'Filter...', className }) => {
    const [localValue, setLocalValue] = useState(value);
    const debouncedOnChange = useDebouncedCallback(onChange, 300);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (newValue: string) => {
        setLocalValue(newValue);
        debouncedOnChange(newValue);
    };

    return <TextInput value={localValue} onChange={handleChange} placeholder={placeholder} className={className as string} />;
};

TextFilter.displayName = 'VirtualTable.TextFilter';
export default TextFilter;
