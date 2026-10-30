import { Search } from 'lucide-react';
import type React from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface IncidentsSearchInputProps {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
    className?: ClassNameValue;
}

const IncidentsSearchInput: React.FC<IncidentsSearchInputProps> = ({ placeholder = 'Search', value = '', onChange, onSubmit, className }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') onSubmit?.();
        if (e.key === 'Escape') {
            onChange?.('');
            onSubmit?.();
        }
    };

    return (
        <div className={twMerge('relative flex items-center bg-gray-50 rounded-lg border-blue-300 border', className)}>
            <Search size={16} className="absolute left-1 text-gray-600" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={30}
                className="pl-6 pr-2 py-1 text-xs rounded outline-none w-full text-gray-800"
            />
        </div>
    );
};

export default IncidentsSearchInput;
