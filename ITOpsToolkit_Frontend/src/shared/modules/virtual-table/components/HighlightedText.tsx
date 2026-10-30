import { type FC, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { useVirtualTableContext } from '../VirtualTableContext';

interface HighlightedTextProps {
    text: string;
    /** Column id - when provided, the column's active filter value is also highlighted */
    columnId?: string;
    /** When false, global search term is NOT highlighted for this cell */
    highlightGlobal?: boolean;
}

interface HighlightSegment {
    text: string;
    source: 'global' | 'column' | 'none';
}

const HighlightedText: FC<HighlightedTextProps> = ({ text, columnId, highlightGlobal = true }) => {
    const { globalFilter, columnFilters, classNames } = useVirtualTableContext();

    const segments = useMemo((): HighlightSegment[] | null => {
        const globalTerm = highlightGlobal && globalFilter ? globalFilter : '';
        let columnTerm = '';

        if (columnId) {
            const colFilter = columnFilters.find((f) => f.id === columnId);
            if (colFilter?.value != null && typeof colFilter.value === 'string' && colFilter.value) {
                columnTerm = colFilter.value;
            }
        }

        if (!globalTerm && !columnTerm) return null;
        if (!text) return null;

        // Build regex parts - column filter first so it gets priority in matching
        const parts: { pattern: string; source: 'global' | 'column' }[] = [];
        if (columnTerm) parts.push({ pattern: columnTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), source: 'column' });
        if (globalTerm) parts.push({ pattern: globalTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), source: 'global' });

        // Create lookup maps for case-insensitive matching
        const termSourceMap = new Map<string, 'global' | 'column'>();
        if (columnTerm) termSourceMap.set(columnTerm.toLowerCase(), 'column');
        if (globalTerm) termSourceMap.set(globalTerm.toLowerCase(), 'global');

        const regex = new RegExp(`(${parts.map((p) => p.pattern).join('|')})`, 'gi');
        const rawParts = text.split(regex);

        return rawParts.map((part) => {
            const source = termSourceMap.get(part.toLowerCase());
            return { text: part, source: source ?? 'none' };
        });
    }, [text, globalFilter, columnFilters, columnId, highlightGlobal]);

    if (!segments) return <>{text}</>;

    return (
        <>
            {segments.map((seg, i) => {
                if (seg.source === 'column') {
                    return (
                        <mark key={i} className={twMerge('rounded-sm bg-blue-200/80 px-0.5 text-inherit', classNames.columnFilterHighlight)}>
                            {seg.text}
                        </mark>
                    );
                }
                if (seg.source === 'global') {
                    return (
                        <mark key={i} className={twMerge('rounded-sm bg-yellow-200/80 px-0.5 text-inherit', classNames.searchHighlight)}>
                            {seg.text}
                        </mark>
                    );
                }
                return seg.text;
            })}
        </>
    );
};

HighlightedText.displayName = 'VirtualTable.HighlightedText';
export default HighlightedText;
