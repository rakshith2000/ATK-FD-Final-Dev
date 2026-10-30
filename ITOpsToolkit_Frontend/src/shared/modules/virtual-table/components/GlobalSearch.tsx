import { type FC, useState, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { Search, X } from 'lucide-react';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';
import { useVirtualTableContext } from '../VirtualTableContext';
import type { GlobalSearchProps } from '../types';

const GlobalSearch: FC<GlobalSearchProps> = ({ placeholder = 'Search all columns...', debounceMs = 300, className, childrenClassNames }) => {
    const { table, classNames } = useVirtualTableContext();
    const [localValue, setLocalValue] = useState(table.getState().globalFilter ?? '');

    // Hide when global filtering is disabled
    if (table.options.enableGlobalFilter === false) return null;

    const debouncedSetGlobalFilter = useDebouncedCallback((value: string) => {
        table.setGlobalFilter(value || undefined);
    }, debounceMs);

    useEffect(() => {
        setLocalValue(table.getState().globalFilter ?? '');
    }, [table.getState().globalFilter]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalValue(value);
        debouncedSetGlobalFilter(value);
    };

    const handleClear = () => {
        setLocalValue('');
        table.setGlobalFilter(undefined);
    };

    return (
        <div className={twMerge('relative flex items-center', classNames.globalSearch, className)}>
            <Search size={14} className={twMerge('absolute left-2 text-gray-400', childrenClassNames?.searchIcon)} />
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={twMerge(
                    'truncate w-full min-w-45 rounded border border-gray-300 bg-white py-1 pl-7 pr-7 text-xs',
                    'placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    childrenClassNames?.input,
                )}
            />
            {localValue && (
                <button type="button" onClick={handleClear} className={twMerge('absolute right-2 cursor-pointer text-gray-400 hover:text-gray-600', childrenClassNames?.clearIcon)}>
                    <X size={14} />
                </button>
            )}
        </div>
    );
};

GlobalSearch.displayName = 'VirtualTable.GlobalSearch';
export default GlobalSearch;
