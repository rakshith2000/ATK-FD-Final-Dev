import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, ChevronDown, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { TextInput } from '@/shared/components/ui/InputFields';

export type KVEntry = { key: string; value: string };

export interface KeyValueEditorClassNames {
    container?: string;
    header?: string;
    label?: string;
    addButton?: string;
    columnLabels?: string;
    emptyState?: string;
    entriesContainer?: string;
    entryRow?: string;
    keyInput?: string;
    valueInput?: string;
    separator?: string;
    deleteButton?: string;
    errorText?: string;
    dropdown?: string;
    dropdownSearch?: string;
    dropdownOption?: string;
}

interface KeyValueEditorProps {
    entries: KVEntry[];
    onChange: (entries: KVEntry[]) => void;
    disabled?: boolean;
    label?: string;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    addLabel?: string;
    emptyMessage?: string;
    allowedKeys?: string[];
    allowCustomKeys?: boolean;
    className?: string;
    classNames?: KeyValueEditorClassNames;
}

interface DropdownPosition {
    top: number;
    left: number;
    width: number;
}

const KeyDropdown: React.FC<{
    value: string;
    allowedKeys: string[];
    allowCustomKeys: boolean;
    disabled: boolean;
    placeholder: string;
    usedKeys: string[];
    onChange: (val: string) => void;
    onBlur: () => void;
    hasError: boolean;
    classNames?: KeyValueEditorClassNames;
}> = ({ value, allowedKeys, allowCustomKeys, disabled, placeholder, usedKeys, onChange, onBlur, hasError, classNames }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(!!value && !allowedKeys.includes(value));
    const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const availableKeys = allowedKeys.filter((k) => k === value || !usedKeys.includes(k));
    const selectedKeys = availableKeys.filter((k) => k === value);
    const unselectedKeys = availableKeys.filter((k) => k !== value && k.toLowerCase().includes(search.toLowerCase()));
    const filteredSelected = selectedKeys.filter((k) => k.toLowerCase().includes(search.toLowerCase()));
    const orderedKeys = [...filteredSelected, ...unselectedKeys];

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
            top: rect.bottom + window.scrollY + 2,
            left: rect.left + window.scrollX,
            width: rect.width,
        });
    }, []);

    const handleOpen = () => {
        if (disabled) return;
        updatePosition();
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
            setOpen(false);
            setSearch('');
            onBlur();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, onBlur]);

    useEffect(() => {
        if (!open) return;
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (open) searchRef.current?.focus();
    }, [open]);

    const borderClass = hasError ? 'border-red-400' : open ? 'border-(--brand-color)/50' : 'border-(--brand-text-muted-color)';

    const baseInputClass =
        'w-full rounded-sm border bg-(--brand-color)/3 px-2 py-1 text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-gray)/40 focus:outline-none focus:bg-transparent disabled:text-(--brand-text-gray) disabled:cursor-not-allowed transition-colors';

    if (isCustomMode) {
        return (
            <div className="relative flex items-center w-full">
                <TextInput
                    value={value}
                    disabled={disabled}
                    placeholder="Custom key"
                    onChange={onChange}
                    onBlur={onBlur}
                    error={hasError}
                    className={twMerge(
                        baseInputClass,
                        'pl-2 pr-16',
                        hasError ? 'border-red-400' : 'border-(--brand-text-muted-color) focus:border-(--brand-color)/50',
                        classNames?.keyInput,
                    )}
                    autoFocus
                />
                <button
                    disabled={disabled}
                    type="button"
                    title="Switch to preset keys"
                    onClick={() => {
                        setIsCustomMode(false);
                        onChange('');
                        requestAnimationFrame(() => {
                            triggerRef.current?.click();
                        });
                    }}
                    className="absolute right-1 flex items-center gap-1 rounded-sm bg-(--brand-color)/8 hover:bg-(--brand-color)/15 border border-(--brand-color)/20 px-1.5 py-0.5 transition-colors group"
                >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="text-(--brand-color) shrink-0">
                        <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[0.55rem] font-semibold tracking-wide text-(--brand-color) uppercase">{disabled ? 'Custom Key' : 'Preset'}</span>
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleOpen}
                className={twMerge(baseInputClass, borderClass, 'flex items-center justify-between gap-1 text-left', classNames?.keyInput)}
            >
                <span aria-disabled={disabled} className={twMerge('aria-disabled:text-(--brand-text-gray)', value ? 'text-(--brand-text-color)' : 'text-(--brand-text-gray)/40')}>
                    {value || placeholder}
                </span>
                <ChevronDown size={11} className={twMerge('shrink-0 text-(--brand-text-gray)/50 transition-transform duration-150', open && 'rotate-180')} />
            </button>

            {open &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: position.top,
                            left: position.left,
                            width: position.width,
                            minWidth: 160,
                            zIndex: 9999,
                        }}
                        className={twMerge('rounded-md border border-(--brand-text-muted-color) bg-white shadow-lg', classNames?.dropdown)}
                    >
                        {/* Search */}
                        <div className={twMerge('flex items-center gap-1.5 border-b border-(--brand-text-muted-color) px-2 py-1.5', classNames?.dropdownSearch)}>
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search keys..."
                                className="flex-1 bg-transparent text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-gray)/40 focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setSearch('');
                                    }}
                                    className="shrink-0 text-(--brand-text-gray)/50 hover:text-(--brand-text-gray)"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>

                        {/* Options */}
                        <ul className="max-h-40 overflow-y-auto py-1">
                            {orderedKeys.length === 0 && <li className="px-3 py-2 text-[0.65rem] italic text-(--brand-text-gray)/60">No keys found</li>}

                            {orderedKeys.map((k, i) => {
                                const isSelected = value === k;
                                const showDivider = i > 0 && filteredSelected.length > 0 && i === filteredSelected.length;

                                return (
                                    <li key={k}>
                                        {showDivider && <div className="mx-2 my-1 h-px bg-(--brand-text-muted-color)/40" />}
                                        <div
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                onChange(k);
                                                setOpen(false);
                                                setSearch('');
                                                onBlur();
                                            }}
                                            className={twMerge(
                                                'flex items-center gap-2 cursor-pointer px-3 py-1.5 text-[0.7rem] font-medium transition-colors hover:bg-(--brand-color)/5 hover:text-(--brand-color)',
                                                isSelected ? 'bg-(--brand-color)/5 text-(--brand-color)' : 'text-(--brand-text-color)',
                                                classNames?.dropdownOption,
                                            )}
                                        >
                                            <span className={twMerge('size-1.5 rounded-full shrink-0', isSelected ? 'bg-(--brand-color)' : 'bg-transparent')} />
                                            {k}
                                        </div>
                                    </li>
                                );
                            })}

                            {allowCustomKeys && (
                                <li>
                                    <div className="mx-2 my-1 h-px bg-(--brand-text-muted-color)/40" />
                                    <div
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setIsCustomMode(true);
                                            onChange('');
                                            setOpen(false);
                                            setSearch('');
                                        }}
                                        className="flex items-center gap-2 cursor-pointer px-3 py-1.5 transition-colors hover:bg-(--brand-color)/5 group"
                                    >
                                        <div className="flex items-center justify-center size-3.5 rounded-sm bg-(--brand-color)/10 group-hover:bg-(--brand-color)/20 transition-colors shrink-0">
                                            <Plus size={8} strokeWidth={2.5} className="text-(--brand-color)" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[0.7rem] font-semibold text-(--brand-color)">Custom key</span>
                                            <span className="text-[0.58rem] text-(--brand-text-gray)/60">Enter a key not in the list</span>
                                        </div>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>,
                    getPortalContainer(),
                )}
        </>
    );
};

// Main component
const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
    entries,
    onChange,
    disabled = false,
    label = 'Additional Config',
    keyPlaceholder = 'Key',
    valuePlaceholder = 'Value',
    addLabel = 'Add Entry',
    emptyMessage = 'No entries added.',
    allowedKeys,
    allowCustomKeys = false,
    className,
    classNames,
}) => {
    const [touched, setTouched] = useState<Record<number, { key?: boolean; value?: boolean }>>({});

    const handleChange = (index: number, field: 'key' | 'value', val: string) => {
        onChange(entries.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
    };

    const handleBlur = (index: number, field: 'key' | 'value') => {
        setTouched((prev) => ({
            ...prev,
            [index]: { ...prev[index], [field]: true },
        }));
    };

    const handleAdd = () => {
        onChange([...entries, { key: '', value: '' }]);
    };

    const handleDelete = (index: number) => {
        onChange(entries.filter((_, i) => i !== index));
        setTouched((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const getError = (index: number, field: 'key' | 'value'): string | null => {
        if (!touched[index]?.[field]) return null;
        return !entries[index]?.[field]?.trim() ? (field === 'key' ? 'Key is required' : 'Value is required') : null;
    };

    const hasDropdown = allowedKeys && allowedKeys.length > 0;

    return (
        <div className={twMerge('flex flex-col gap-1.5 rounded-md border text-gray-300 px-3 py-2.5', className, classNames?.container)}>
            {/* Header */}
            <div className={twMerge('flex items-center justify-between mb-1', classNames?.header)}>
                <span className={twMerge('text-[0.65rem] font-semibold tracking-wide uppercase text-(--brand-title-primary-color)', classNames?.label)}>{label}</span>
                {!disabled && (
                    <button
                        type="button"
                        onClick={handleAdd}
                        className={twMerge(
                            'flex items-center gap-1 rounded-full border border-(--brand-color)/30 bg-(--brand-color)/5 px-2.5 py-0.5 text-[0.6rem] font-semibold text-(--brand-color) hover:bg-(--brand-color)/10 transition-colors cursor-pointer',
                            classNames?.addButton,
                        )}
                    >
                        <Plus size={10} strokeWidth={2.5} />
                        {addLabel}
                    </button>
                )}
            </div>

            {/* Column labels */}
            {entries.length > 0 && (
                <div className={twMerge('flex items-center gap-2 px-0.5', classNames?.columnLabels)}>
                    <span className="flex-1 text-[0.6rem] font-medium uppercase tracking-wider text-(--brand-title-primary-color)">Key</span>
                    <span className="w-3" />
                    <span className="flex-1 text-[0.6rem] font-medium uppercase tracking-wider text-(--brand-title-primary-color)">Value</span>
                    {!disabled && <span className="w-5" />}
                </div>
            )}

            {/* Empty state */}
            {entries.length === 0 && (
                <div className={twMerge('flex items-center justify-center py-3', classNames?.emptyState)}>
                    <p className="text-[0.65rem] italic text-(--brand-text-gray)/60">{emptyMessage}</p>
                </div>
            )}

            {/* Entries */}
            <div className={twMerge('flex flex-col gap-1.5', classNames?.entriesContainer)}>
                {entries.map((entry, index) => {
                    const keyError = getError(index, 'key');
                    const valueError = getError(index, 'value');
                    const usedKeys = entries
                        .filter((_, i) => i !== index)
                        .map((e) => e.key)
                        .filter(Boolean);

                    return (
                        <div key={index} className={twMerge('flex flex-col gap-0.5', classNames?.entryRow)}>
                            <div className="flex items-center gap-2">
                                {/* Key */}
                                <div className="flex-1 min-w-0">
                                    {hasDropdown ? (
                                        <KeyDropdown
                                            value={entry.key}
                                            allowedKeys={allowedKeys}
                                            allowCustomKeys={allowCustomKeys}
                                            disabled={disabled}
                                            placeholder={keyPlaceholder}
                                            usedKeys={usedKeys}
                                            hasError={!!keyError}
                                            onChange={(val) => handleChange(index, 'key', val)}
                                            onBlur={() => handleBlur(index, 'key')}
                                            classNames={classNames}
                                        />
                                    ) : (
                                        <TextInput
                                            value={entry.key}
                                            disabled={disabled}
                                            placeholder={keyPlaceholder}
                                            onChange={(val) => handleChange(index, 'key', val)}
                                            onBlur={() => handleBlur(index, 'key')}
                                            error={!!keyError}
                                            className={twMerge(
                                                'w-full rounded-sm border bg-(--brand-color)/3 px-2 py-1 text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-gray)/40 focus:outline-none focus:bg-transparent disabled:text-(--brand-text-gray) disabled:cursor-not-allowed transition-colors',
                                                keyError ? 'border-red-400' : 'border-(--brand-text-muted-color) focus:border-(--brand-color)/50',
                                                classNames?.keyInput,
                                            )}
                                        />
                                    )}
                                </div>

                                <span className={twMerge('text-[0.65rem] font-bold text-(--brand-text-gray)/40 shrink-0', classNames?.separator)}>=</span>

                                {/* Value */}
                                <div className="flex-1 min-w-0">
                                    <TextInput
                                        value={entry.value}
                                        disabled={disabled}
                                        placeholder={valuePlaceholder}
                                        onChange={(val) => handleChange(index, 'value', val)}
                                        onBlur={() => handleBlur(index, 'value')}
                                        error={!!valueError}
                                        className={twMerge(
                                            'w-full rounded-sm border bg-(--brand-color)/3 px-2 py-1 text-[0.7rem] font-medium text-(--brand-text-color) placeholder:text-(--brand-text-gray)/40 focus:outline-none focus:bg-transparent disabled:text-(--brand-text-gray) disabled:cursor-not-allowed transition-colors',
                                            valueError ? 'border-red-400' : 'border-(--brand-text-muted-color) focus:border-(--brand-color)/50',
                                            classNames?.valueInput,
                                        )}
                                    />
                                </div>

                                {/* Delete */}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(index)}
                                        className={twMerge(
                                            'shrink-0 rounded p-0.5 text-(--brand-text-gray)/50 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer',
                                            classNames?.deleteButton,
                                        )}
                                        title="Remove entry"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Inline errors */}
                            {(keyError || valueError) && (
                                <div className="flex items-center gap-2 px-0.5">
                                    <span className={twMerge('flex-1 text-[0.6rem] font-medium text-red-400', classNames?.errorText)}>{keyError ?? ''}</span>
                                    <span className="w-3" />
                                    <span className={twMerge('flex-1 text-[0.6rem] font-medium text-red-400', classNames?.errorText)}>{valueError ?? ''}</span>
                                    {!disabled && <span className="w-5" />}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KeyValueEditor;
