import { type FC, useState, useRef, useMemo, useCallback, useEffect, type ComponentPropsWithoutRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useDropdownPosition } from './shared/useDropdownPosition';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';
import DropdownShell from './shared/DropdownShell';
import OptionsList from './shared/OptionsList';
import type { SelectOption } from './types';

interface SelectInputProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'value'> {
    value?: string;
    id?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    options?: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    /** External options Loading indicator */
    isLoading?: boolean;
    triggerClassName?: string;
    clearable?: boolean;
    /** External error message to display in the dropdown (e.g. from a query failure). */
    errorMessage?: string;
    /** Retry handler for external error. */
    onRetry?: () => void;
    /** Refetch handler. */
    onRefetch?: () => void;
    /** Async option fetcher - when provided, options are fetched on open and on search term change. */
    optionsAsync?: (searchTerm: string) => Promise<SelectOption[]>;
    /** Debounce delay (ms) for async search. Defaults to 300. */
    optionsAsyncDebounce?: number;
}

const SelectInput: FC<SelectInputProps> = ({
    value = '',
    id,
    onChange,
    onBlur,
    options = [],
    placeholder = 'Select...',
    disabled,
    error,
    isLoading: isLoadingProp,
    className,
    triggerClassName,
    clearable = true,
    errorMessage: errorMessageProp,
    onRetry: onRetryProp,
    onRefetch: onRefetchProp,
    optionsAsync,
    optionsAsyncDebounce = 300,
    ...rest
}) => {
    const randomId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Track disabled via ref so DOM manipulation cannot bypass the guard
    const disabledRef = useRef(disabled);
    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);

    // Cache label for async mode so it survives dropdown close
    const labelCacheRef = useRef<Map<string, string>>(new Map());

    const { dropdownPos, updatePosition } = useDropdownPosition(triggerRef, isOpen);

    const closeDropdown = useCallback(() => {
        setIsOpen(false);
    }, []);

    useClickOutside([triggerRef, dropdownRef], closeDropdown, isOpen);

    const isAsync = !!optionsAsync;

    const debouncedCommit = useDebouncedCallback((val: string) => setDebouncedSearchTerm(val), optionsAsyncDebounce);

    const handleSearchTermChange = useCallback(
        (val: string) => {
            setSearchTerm(val);
            debouncedCommit(val);
        },
        [debouncedCommit],
    );

    // Reset search input on close
    useEffect(() => {
        if (!isOpen) {
            debouncedCommit.cancel();
            setSearchTerm('');
            setDebouncedSearchTerm('');
        }
    }, [isOpen, debouncedCommit]);

    // React Query for async options fetching
    const {
        data: asyncOptions = [],
        isFetching: isLoadingAsync,
        error: asyncErrorObject,
        refetch: refetchAsync,
    } = useQuery({
        queryKey: ['select-options', debouncedSearchTerm, optionsAsync?.name, (optionsAsync as Record<string, unknown> | undefined)?.depKey, id ?? randomId],
        queryFn: async () => {
            if (!optionsAsync) return [];
            const result = await optionsAsync(debouncedSearchTerm);
            // Cache label for async mode so it survives dropdown close
            result.forEach((o) => labelCacheRef.current.set(o.value, o.label));
            return result;
        },
        enabled: isOpen && isAsync,
    });

    const asyncError = asyncErrorObject ? (asyncErrorObject instanceof Error ? asyncErrorObject.message : 'Failed to load options') : null;

    const resolvedOptions = isAsync ? asyncOptions : options;
    const isLoading = isLoadingProp || (isAsync && isLoadingAsync);

    const filteredOptions = useMemo(() => {
        if (isAsync) return resolvedOptions; // async already returns filtered results
        if (!searchTerm.trim()) return resolvedOptions;
        const lower = searchTerm.toLowerCase();
        return resolvedOptions.filter((o) => o.label.toLowerCase().includes(lower) || o.value.toLowerCase().includes(lower));
    }, [resolvedOptions, searchTerm, isAsync]);

    const selectedLabel =
        resolvedOptions.find((o) => o.value === value)?.label ?? options.find((o) => o.value === value)?.label ?? (isAsync && value ? labelCacheRef.current.get(value) : undefined);

    const hasValue = !!value && value !== '';

    // If value exists but isn't found in resolvedOptions (current loaded dropdown search results), synthesize a fallback option.
    // Skip ghost when user is actively searching — don't pollute search results with the fallback.
    const isSearching = isAsync ? !!debouncedSearchTerm : !!searchTerm.trim();
    const ghostOption = useMemo(() => {
        if (isSearching) return null;
        if (!hasValue) return null;
        const exists = resolvedOptions.some((o) => o.value === value);
        if (exists) return null;

        const label = selectedLabel ?? value!;
        return { value: value!, label };
    }, [isSearching, hasValue, resolvedOptions, value, selectedLabel]);

    const handleSelect = (optionValue: string) => {
        if (disabledRef.current) return;
        onChange?.(optionValue);
        closeDropdown();
        onBlur?.();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabledRef.current) return;
        onChange?.('');
        onBlur?.();
    };

    return (
        <div className={twMerge('relative w-full', className)}>
            <button
                ref={triggerRef}
                type="button"
                disabled={!!disabled}
                onClick={() => {
                    if (disabledRef.current) return;
                    if (!isOpen) updatePosition();
                    setIsOpen(!isOpen);
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                aria-readonly={disabled}
                tabIndex={disabled ? -1 : 0}
                className={twMerge(
                    'flex w-full cursor-pointer items-center justify-between rounded border border-gray-300 bg-white px-2 py-1 text-xs transition-colors',
                    'hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    !hasValue && 'text-gray-500',
                    error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
                    disabled && 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none',
                    triggerClassName,
                )}
                {...rest}
            >
                <span className={twMerge('truncate', !hasValue && 'text-gray-300')}>{hasValue ? (selectedLabel ?? value) : placeholder}</span>
                <span className="ml-1 flex shrink-0 items-center gap-0.5">
                    {hasValue && !disabled && clearable && <X size={12} className="text-gray-400 hover:text-gray-600" onClick={handleClear} aria-label="Clear selection" />}
                    {isLoading ? (
                        <Loader2 size={12} className="animate-spin text-gray-400" />
                    ) : (
                        <ChevronDown size={12} className={twMerge('text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                    )}
                </span>
            </button>

            {isOpen && (
                <DropdownShell
                    dropdownRef={dropdownRef}
                    top={dropdownPos.top}
                    bottom={dropdownPos.bottom}
                    left={dropdownPos.left}
                    width={dropdownPos.width}
                    maxListHeight={dropdownPos.maxListHeight}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchTermChange}
                    isLoading={isLoading}
                    searchPlaceholder={isAsync ? 'Type to search...' : 'Search...'}
                    onRefetch={
                        isAsync || onRefetchProp
                            ? async () => {
                                  await onRefetchProp?.();
                                  if (isAsync) refetchAsync();
                              }
                            : undefined
                    }
                >
                    <OptionsList
                        options={ghostOption ? [ghostOption, ...filteredOptions] : filteredOptions}
                        isLoading={isLoading}
                        searchTerm={searchTerm}
                        isSelected={(v) => v === value}
                        onSelect={handleSelect}
                        errorMessage={asyncError ?? errorMessageProp ?? undefined}
                        onRetry={
                            asyncError || onRetryProp
                                ? async () => {
                                      await onRetryProp?.();
                                      if (isAsync) refetchAsync();
                                  }
                                : undefined
                        }
                    />
                </DropdownShell>
            )}
        </div>
    );
};

export default SelectInput;
