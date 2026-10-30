import { type FC, type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import { Search, Loader2, X, RefreshCw } from 'lucide-react';

interface DropdownShellProps {
    dropdownRef: RefObject<HTMLDivElement | null>;
    top: number | undefined;
    bottom: number | undefined;
    left: number;
    width: number;
    maxListHeight: number;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    isLoading?: boolean;
    searchPlaceholder?: string;
    children: ReactNode;
    footer?: ReactNode;
    onRefetch?: () => void;
}

const DropdownShell: FC<DropdownShellProps> = ({
    dropdownRef,
    top,
    bottom,
    left,
    width,
    maxListHeight,
    searchTerm,
    onSearchChange,
    isLoading,
    searchPlaceholder = 'Search...',
    children,
    footer,
    onRefetch,
}) => {
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    return createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top,
                bottom,
                left,
                width,
                zIndex: 9999,
            }}
            className="rounded border border-gray-200 bg-white shadow-lg"
            data-portal-dropdown="true"
        >
            {/* Search bar */}
            <div className="border-b border-gray-100 px-2 py-1.5">
                <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5">
                    {isLoading ? <Loader2 size={11} className="shrink-0 animate-spin text-blue-400" /> : <Search size={11} className="shrink-0 text-gray-400" />}
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full border-none bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-300"
                    />
                    {searchTerm && (
                        <button type="button" onClick={() => onSearchChange('')} className="shrink-0 cursor-pointer text-gray-400 hover:text-gray-600">
                            <X size={10} />
                        </button>
                    )}
                    {onRefetch && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefetch();
                            }}
                            disabled={isLoading}
                            className="shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            title="Refetch options"
                        >
                            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable options area */}
            <div className="overflow-auto" style={{ maxHeight: maxListHeight }}>
                {children}
            </div>

            {/* Optional footer */}
            {footer}
        </div>,
        getPortalContainer(),
    );
};

export default DropdownShell;
