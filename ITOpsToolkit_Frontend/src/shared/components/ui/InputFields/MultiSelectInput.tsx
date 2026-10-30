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

interface MultiSelectInputProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'value'> {
    value?: string[];
    id?: string;
    onChange?: (value: string[]) => void;
    onBlur?: () => void;
    options?: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    /** External options Loading indicator */
    isLoading?: boolean;
    maxChips?: number;
    triggerClassName?: string;
    chipClassName?: string;
    chipDeleteClassName?: string;
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
    selectedItemClassName?: string;
    selectedCheckboxClassName?: string;
    textClassName?: string;
}

const MultiSelectInput: FC<MultiSelectInputProps> = ({
    value = [],
    id,
    onChange,
    onBlur,
    options = [],
    placeholder = 'Select...',
    disabled,
    error,
    isLoading: isLoadingProp,
    maxChips,
    className,
    triggerClassName,
    chipClassName,
    chipDeleteClassName,
    selectedCheckboxClassName,
    textClassName,
    selectedItemClassName,
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

    // Cache labels for async mode so they survive dropdown close
    const labelCacheRef = useRef<Map<string, string>>(new Map());

    const { dropdownPos, updatePosition } = useDropdownPosition(triggerRef, isOpen);

    const selectedValues = Array.isArray(value) ? value : [];

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
        queryKey: ['multi-select-options', debouncedSearchTerm, optionsAsync?.name, (optionsAsync as Record<string, unknown> | undefined)?.depKey, id ?? randomId],
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

    // Skip ghost options when user is actively searching — don't pollute search results with fallbacks.
    const isSearching = isAsync ? !!debouncedSearchTerm : !!searchTerm.trim();

    const filteredOptions = useMemo(() => {
        const base = isAsync
            ? resolvedOptions
            : (() => {
                  if (!searchTerm.trim()) return resolvedOptions;
                  const lower = searchTerm.toLowerCase();
                  return resolvedOptions.filter((o) =>
                      String(o.label ?? '')
                          .toLowerCase()
                          .includes(lower),
                  );
              })();

        // Prepend ghost options (values not found in any option source) — skip when searching
        if (isSearching) return base;
        const ghosts = selectedValues
            .filter((sv) => !resolvedOptions.some((o) => o.value === sv))
            .map((sv) => {
                const label = options.find((o) => o.value === sv)?.label ?? labelCacheRef.current.get(sv) ?? sv;
                return { value: sv, label };
            });

        return ghosts.length ? [...ghosts, ...base] : base;
    }, [resolvedOptions, searchTerm, isAsync, selectedValues, isSearching]);

    const handleSelect = (optionValue: string) => {
        if (disabledRef.current) return;
        const newValues = selectedValues.includes(optionValue) ? selectedValues.filter((v) => v !== optionValue) : [...selectedValues, optionValue];
        onChange?.(newValues);
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabledRef.current) return;
        const allValues = filteredOptions.map((o) => o.value);
        // Merge with existing selections to keep values from outside current filter
        const merged = Array.from(new Set([...selectedValues, ...allValues]));
        onChange?.(merged);
    };

    const handleDeselectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabledRef.current) return;
        const filteredValues = new Set(filteredOptions.map((o) => o.value));
        // Only deselect values visible in current filter
        onChange?.(selectedValues.filter((v) => !filteredValues.has(v)));
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabledRef.current) return;
        onChange?.([]);
        onBlur?.();
    };

    const handleRemoveChip = (e: React.MouseEvent, chipValue: string) => {
        e.stopPropagation();
        if (disabledRef.current) return;
        onChange?.(selectedValues.filter((v) => v !== chipValue));
    };

    const hasValue = selectedValues.length > 0;
    const visibleChips = maxChips ? selectedValues.slice(0, maxChips) : selectedValues;
    const hiddenCount = maxChips ? Math.max(0, selectedValues.length - maxChips) : 0;

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
                    'flex w-full cursor-pointer items-center justify-between rounded border border-gray-300 bg-white px-2 py-1 text-xs min-h-7 transition-colors',
                    'hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    !hasValue && 'text-gray-500',
                    error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
                    disabled && 'bg-gray-50 text-gray-500 cursor-default select-text pointer-events-none',
                    triggerClassName,
                )}
                {...rest}
            >
                <span className="flex flex-1 flex-wrap gap-1 min-w-0">
                    {hasValue ? (
                        <>
                            {visibleChips.map((sv) => {
                                const label =
                                    resolvedOptions.find((o) => o.value === sv)?.label ?? options.find((o) => o.value === sv)?.label ?? labelCacheRef.current.get(sv) ?? sv; //ghost fallback: render raw value
                                return (
                                    <span
                                        key={sv}
                                        className={twMerge(
                                            'inline-flex items-center gap-1 rounded border border-current/20 bg-current/5 px-1.5 py-1 text-[0.65rem] leading-tight text-current max-w-27.5',
                                            chipClassName,
                                        )}
                                    >
                                        <span className="truncate">{label}</span>
                                        {!disabled && (
                                            <X
                                                size={11}
                                                className={twMerge('shrink-0 cursor-pointer opacity-60 hover:opacity-100 transition-opacity', chipDeleteClassName)}
                                                onClick={(e) => handleRemoveChip(e, sv)}
                                                aria-label={`Remove ${label}`}
                                            />
                                        )}
                                    </span>
                                );
                            })}
                            {hiddenCount > 0 && (
                                <span className="inline-flex items-center rounded border border-current/15 bg-current/5 px-1.5 py-0.5 text-[0.65rem] leading-tight opacity-70">
                                    +{hiddenCount} more
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="truncate text-gray-300">{placeholder}</span>
                    )}
                </span>
                <span className="ml-1 flex shrink-0 items-center gap-0.5">
                    {hasValue && !disabled && <X size={12} className="text-gray-400 hover:text-gray-600" onClick={handleClearAll} aria-label="Clear all selections" />}
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
                    onRefetch={
                        isAsync || onRefetchProp
                            ? async () => {
                                  await onRefetchProp?.();
                                  if (isAsync) refetchAsync();
                              }
                            : undefined
                    }
                    footer={
                        <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1">
                            <div className="flex items-center gap-2">
                                {filteredOptions.length > 0 && filteredOptions.some((o) => !selectedValues.includes(o.value)) && (
                                    <button type="button" onClick={handleSelectAll} className="cursor-pointer text-[10px] text-blue-500 hover:text-blue-700">
                                        Select all
                                    </button>
                                )}
                                {filteredOptions.length > 0 && filteredOptions.some((o) => selectedValues.includes(o.value)) && (
                                    <button type="button" onClick={handleDeselectAll} className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-700">
                                        Deselect all
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {hasValue && <span className="text-[10px] text-gray-400">{selectedValues.length} selected</span>}
                                {hasValue && (
                                    <button type="button" onClick={handleClearAll} className="cursor-pointer text-[10px] text-red-500 hover:text-red-700">
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </div>
                    }
                >
                    <OptionsList
                        options={filteredOptions}
                        isLoading={isLoading}
                        searchTerm={searchTerm}
                        isSelected={(v) => selectedValues.includes(v)}
                        selectedCheckboxClassName={selectedCheckboxClassName}
                        textClassName={textClassName}
                        selectedItemClassName={selectedItemClassName}
                        onSelect={handleSelect}
                        multiple
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

export default MultiSelectInput;
