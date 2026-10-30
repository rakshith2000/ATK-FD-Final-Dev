import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { ListSkeleton } from '../Skeletons';

export interface TransferListItem<T = unknown> {
    key: string;
    label: string;
    description?: string;
    /** Attach arbitrary source data to the item for consumer access after transfer */
    meta?: T;
}

interface TransferListProps {
    /** All available items (left side) */
    available: TransferListItem[];
    /** Currently selected items (right side) */
    selected: TransferListItem[];
    /** Called when the selected items change */
    onChange: (selected: TransferListItem[]) => void;
    /** Left panel title */
    availableTitle?: string;
    /** Right panel title */
    selectedTitle?: string;
    /** Placeholder text for search inputs */
    searchPlaceholder?: string;
    /** Height of the list panels */
    height?: string;
    /** Whether the component is in a loading state */
    isLoading?: boolean;
}

const TransferList: React.FC<TransferListProps> = ({
    available,
    selected,
    onChange,
    availableTitle = 'Available',
    selectedTitle = 'Selected',
    searchPlaceholder = 'Search...',
    height = '360px',
    isLoading = false,
}) => {
    const [leftSearch, setLeftSearch] = useState('');
    const [rightSearch, setRightSearch] = useState('');
    const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
    const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());

    const selectedKeys = useMemo(() => new Set(selected.map((s) => s.key)), [selected]);

    const matchesSearch = (item: TransferListItem, term: string) =>
        item.label.toLowerCase().includes(term) || item.key.toLowerCase().includes(term) || (item.description?.toLowerCase().includes(term) ?? false);

    const filteredAvailable = useMemo(() => {
        const term = leftSearch.toLowerCase();
        return available.filter((item) => !selectedKeys.has(item.key) && matchesSearch(item, term));
    }, [available, selectedKeys, leftSearch]);

    const filteredSelected = useMemo(() => {
        const term = rightSearch.toLowerCase();
        return selected.filter((item) => matchesSearch(item, term));
    }, [selected, rightSearch]);

    const moveRight = () => {
        if (leftChecked.size === 0) return;
        const toAdd = available.filter((item) => leftChecked.has(item.key));
        onChange([...selected, ...toAdd]);
        setLeftChecked(new Set());
    };

    const moveLeft = () => {
        if (rightChecked.size === 0) return;
        onChange(selected.filter((item) => !rightChecked.has(item.key)));
        setRightChecked(new Set());
    };

    const moveAllRight = () => {
        onChange([...selected, ...filteredAvailable]);
        setLeftChecked(new Set());
    };

    const moveAllLeft = () => {
        const filteredKeys = new Set(filteredSelected.map((s) => s.key));
        onChange(selected.filter((item) => !filteredKeys.has(item.key)));
        setRightChecked(new Set());
    };

    const toggleLeftCheck = (key: string) => {
        setLeftChecked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleRightCheck = (key: string) => {
        setRightChecked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const renderPanel = (
        title: string,
        items: TransferListItem[],
        totalCount: number,
        checked: Set<string>,
        toggleCheck: (key: string) => void,
        search: string,
        setSearch: (v: string) => void,
    ) => (
        <div className="flex-1 min-w-0 border border-gray-200 rounded-lg flex flex-col bg-white">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-600">
                        {title} ({items.length}
                        {items.length !== totalCount ? ` / ${totalCount}` : ''})
                    </span>
                    {checked.size > 0 && <span className="text-[10px] text-blue-500">{checked.size} checked</span>}
                </div>
                <div className="relative mt-1.5">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full rounded border border-gray-200 bg-white pl-7 pr-2 py-1 text-[11px] placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: height }}>
                {isLoading ? (
                    <ListSkeleton rows={5} VW={600} />
                ) : items.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-[11px] text-gray-400">{search ? 'No matches' : 'No items'}</div>
                ) : (
                    items.map((item) => (
                        <label
                            key={item.key}
                            className={`flex items-start gap-2 px-3 py-1.5 border-b border-gray-50 cursor-pointer transition-colors hover:bg-blue-50/50 ${checked.has(item.key) ? 'bg-blue-50' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={checked.has(item.key)}
                                onChange={() => toggleCheck(item.key)}
                                className="size-3 rounded border-gray-300 text-blue-500 mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-medium text-gray-700 truncate">{item.label}</div>
                                {item.description && <div className="text-[10px] text-gray-400 truncate">{item.description}</div>}
                            </div>
                        </label>
                    ))
                )}
            </div>
        </div>
    );

    const availableCount = available.filter((item) => !selectedKeys.has(item.key)).length;

    return (
        <div className="flex items-stretch gap-2">
            {renderPanel(availableTitle, filteredAvailable, availableCount, leftChecked, toggleLeftCheck, leftSearch, setLeftSearch)}

            {/* Transfer buttons */}
            <div className="flex flex-col items-center justify-center gap-1.5 px-1">
                <button
                    type="button"
                    onClick={moveAllRight}
                    disabled={filteredAvailable.length === 0}
                    className="p-1 rounded border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move all right"
                >
                    <ChevronsRight size={14} />
                </button>
                <button
                    type="button"
                    onClick={moveRight}
                    disabled={leftChecked.size === 0}
                    className="p-1 rounded border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move selected right"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    type="button"
                    onClick={moveLeft}
                    disabled={rightChecked.size === 0}
                    className="p-1 rounded border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move selected left"
                >
                    <ChevronLeft size={14} />
                </button>
                <button
                    type="button"
                    onClick={moveAllLeft}
                    disabled={filteredSelected.length === 0}
                    className="p-1 rounded border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move all left"
                >
                    <ChevronsLeft size={14} />
                </button>
            </div>

            {renderPanel(selectedTitle, filteredSelected, selected.length, rightChecked, toggleRightCheck, rightSearch, setRightSearch)}
        </div>
    );
};

export default TransferList;
