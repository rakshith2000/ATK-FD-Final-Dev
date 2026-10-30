import { type FC, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, X, Search, Tag } from 'lucide-react';

interface TagFilterProps {
    value: string[];
    onChange: (value: string[]) => void;
    /** All unique tags extracted from the column data. */
    availableTags: string[];
    placeholder?: string;
    className?: string;
}

/** Multi-select tag filter - shows available tags as checkable chips in a dropdown. */
const TagFilter: FC<TagFilterProps> = ({ value = [], onChange, availableTags, placeholder = 'Filter tags...', className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, maxListHeight: 192 });

    const selected = useMemo(() => new Set(value), [value]);

    const filteredTags = useMemo(() => {
        if (!searchTerm.trim()) return availableTags;
        const lower = searchTerm.toLowerCase();
        return availableTags.filter((t) => t.toLowerCase().includes(lower));
    }, [availableTags, searchTerm]);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const margin = 8;
        const gap = 4;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fixedHeight = 46;
        const minListHeight = 60;
        const defaultMaxList = 192;
        const width = Math.min(Math.max(rect.width, 180), vw - margin * 2);
        const left = Math.max(margin, Math.min(rect.left, vw - width - margin));
        const spaceBelow = vh - rect.bottom - gap - margin;
        const spaceAbove = rect.top - gap - margin;
        let top: number;
        let maxListHeight: number;
        if (spaceBelow >= minListHeight + fixedHeight || spaceBelow >= spaceAbove) {
            top = rect.bottom + gap;
            maxListHeight = Math.min(defaultMaxList, spaceBelow - fixedHeight);
        } else {
            maxListHeight = Math.min(defaultMaxList, spaceAbove - fixedHeight);
            const dropdownHeight = Math.max(minListHeight, maxListHeight) + fixedHeight;
            top = rect.top - gap - dropdownHeight;
        }
        setDropdownPos({ top, left, width, maxListHeight: Math.max(minListHeight, maxListHeight) });
    }, []);

    const closeDropdown = useCallback(() => setIsOpen(false), []);
    useClickOutside([triggerRef, dropdownRef], closeDropdown, isOpen);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (isOpen && searchInputRef.current) searchInputRef.current.focus();
        if (!isOpen) setSearchTerm('');
    }, [isOpen]);

    const toggleTag = (tag: string) => {
        if (selected.has(tag)) {
            onChange(value.filter((t) => t !== tag));
        } else {
            onChange([...value, tag]);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className={twMerge('relative w-full', className)}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                    if (!isOpen) updatePosition();
                    setIsOpen(!isOpen);
                }}
                className={twMerge(
                    'flex w-full cursor-pointer items-center justify-between rounded border border-gray-300 bg-white px-2 py-1 text-xs',
                    'hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    value.length === 0 && 'text-gray-400',
                )}
            >
                <span className="flex items-center gap-1 truncate">
                    <Tag size={10} className="shrink-0 text-gray-400" />
                    {value.length === 0 ? placeholder : `${value.length} tag${value.length === 1 ? '' : 's'} selected`}
                </span>
                <span className="ml-1 flex shrink-0 items-center gap-0.5">
                    {value.length > 0 && <X size={12} className="text-gray-400 hover:text-gray-600" onClick={handleClear} />}
                    <ChevronDown size={12} className={twMerge('text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                </span>
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                        className="rounded border border-gray-200 bg-white shadow-lg"
                    >
                        {/* Search */}
                        <div className="border-b border-gray-100 px-2 py-1.5">
                            <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">
                                <Search size={11} className="shrink-0 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search tags..."
                                    className="w-full border-none bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                                />
                                {searchTerm && (
                                    <button type="button" onClick={() => setSearchTerm('')} className="shrink-0 cursor-pointer text-gray-400 hover:text-gray-600">
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tag list */}
                        <div className="overflow-auto" style={{ maxHeight: dropdownPos.maxListHeight }}>
                            {filteredTags.length === 0 ? (
                                <div className="px-2 py-1.5 text-xs text-gray-400">{searchTerm ? 'No matching tags' : 'No tags'}</div>
                            ) : (
                                filteredTags.map((tag) => {
                                    const isSelected = selected.has(tag);
                                    return (
                                        <button
                                            type="button"
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={twMerge(
                                                'flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-gray-50',
                                                isSelected && 'bg-blue-50',
                                            )}
                                        >
                                            <span
                                                className={twMerge(
                                                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                                                    isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 bg-white',
                                                )}
                                            >
                                                {isSelected && (
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                        <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </span>
                                            <span className={twMerge('rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium', isSelected && 'bg-blue-100 text-blue-700')}>
                                                {tag}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    getPortalContainer(),
                )}
        </div>
    );
};

export default TagFilter;
