import type { FC } from 'react';
import { Loader2, Check, AlertCircle, RotateCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { SelectOption } from '../types';

interface OptionsListProps {
    options: SelectOption[];
    isLoading?: boolean;
    searchTerm?: string;
    isSelected: (value: string) => boolean;
    onSelect: (value: string) => void;
    multiple?: boolean;
    /** Error message to display when async fetch fails */
    errorMessage?: string;
    /** Callback to retry the failed fetch */
    onRetry?: () => void;
    selectedItemClassName?: string;
    selectedCheckboxClassName?: string;
    textClassName?: string;
}

const OptionsList: FC<OptionsListProps> = ({
    options,
    isLoading,
    searchTerm,
    isSelected,
    onSelect,
    multiple,
    errorMessage,
    onRetry,
    selectedItemClassName = 'bg-blue-50 text-blue-700',
    selectedCheckboxClassName = 'border-blue-500 bg-blue-500 text-white',
    textClassName,
}) => {
    if (errorMessage && !isLoading) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-2.5">
                <AlertCircle size={12} className="shrink-0 text-red-400" />
                <span className="min-w-0 flex-1 truncate text-xs text-red-500" title={errorMessage}>
                    {errorMessage}
                </span>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <RotateCw size={11} />
                    </button>
                )}
            </div>
        );
    }

    if (isLoading && options.length === 0) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-3 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" />
                Loading...
            </div>
        );
    }

    if (options.length === 0) {
        return <div className="px-2 py-1.5 text-xs text-gray-400">{searchTerm ? 'No matches' : 'No options'}</div>;
    }

    return (
        <>
            {options.map((option) => (
                <button
                    type="button"
                    key={option.value}
                    onClick={() => onSelect(option.value)}
                    className={twMerge(
                        'flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-gray-50',
                        isSelected(option.value) && selectedItemClassName,
                    )}
                >
                    {multiple && (
                        <span
                            className={twMerge(
                                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors',
                                isSelected(option.value) ? selectedCheckboxClassName : 'border-gray-300 bg-white',
                            )}
                        >
                            {isSelected(option.value) && <Check size={10} strokeWidth={3} />}
                        </span>
                    )}
                    <span className={twMerge(textClassName)}>{option.label}</span>
                </button>
            ))}
        </>
    );
};

export default OptionsList;
