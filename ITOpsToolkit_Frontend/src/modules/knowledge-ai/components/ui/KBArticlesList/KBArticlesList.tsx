import type { KnowledgeArticle } from '@/modules/knowledge-ai/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import KBArticleCard, { type KBArticleCardProps } from '../KBArticleCard/KBArticleCard';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import useResponsiveScreenSize from '@/shared/hooks/useResponsiveScreenSize';
import { FormField, MultiSelectInput, TextInput, type SelectOption } from '@/shared/components/ui/InputFields';
import { twMerge } from 'tailwind-merge';

interface KBArticlesListProps {
    articles: Array<KnowledgeArticle>;
    onSelect: (kbArticleNumber: string) => void;
    isLoading?: boolean;
    isError?: boolean;
    isRefetching?: boolean;
    error: Error | null;
    onRefetch?: () => void;
    loadingTitle?: string;
    errorTitle?: string;
    noDataTitle?: string;
    columns?: number;
    kbCardConfig?: KBArticleCardProps['config'];
    showArticleSearch?: boolean;
}

const selectTriggerClassName = 'h-[25px] text-[0.65rem] font-medium text-[var(--brand-text-color)] disabled:text-[var(--brand-text-gray)]';
const inputClassName = 'h-[25px] text-[0.65rem] font-medium text-[var(--brand-text-color)] placeholder:text-gray-300 disabled:text-[var(--brand-text-gray)]';
const labelClassName = 'text-[0.65rem] text-[var(--brand-title-primary-color)] mb-0.5';
const errorClassName = 'text-[0.65rem] font-medium text-red-500';

const KBArticlesList: React.FC<KBArticlesListProps> = ({
    articles,
    onSelect,
    error,
    isError,
    isLoading,
    onRefetch,
    errorTitle,
    noDataTitle,
    isRefetching,
    columns: originalCols = 2,
    kbCardConfig,
    showArticleSearch = true,
}) => {
    const [filters, setFilters] = useState<{ search: string; categories: string[] }>({ search: '', categories: [] });

    let filteredArticles = articles;

    const hasCategoryFilter = filters?.categories && filters.categories.length > 0;
    const hasSearchFilter = filters?.search && filters.search.length > 0;

    if (hasCategoryFilter || hasSearchFilter) {
        filteredArticles = filteredArticles.filter((article) => {
            // If category filter is active, it must match. Otherwise, default to true.
            const matchesCategory = !hasCategoryFilter || filters.categories.includes(article.kb_metadata?.kb_category);

            // If search filter is active, it must match title or number. Otherwise, default to true.
            const matchesSearch =
                !hasSearchFilter ||
                article.kb_metadata?.title.toLocaleLowerCase()?.includes(filters.search?.toLocaleLowerCase()) ||
                article.kb_metadata?.number?.toLocaleLowerCase()?.includes(filters.search.toLocaleLowerCase());

            // Article must pass both conditions to be included
            return matchesCategory && matchesSearch;
        });
    }

    const { lt: screenSizeLessThen, gt: screenSizeGreaterThen } = useResponsiveScreenSize();

    const parentRef = useRef<HTMLDivElement>(null);

    const uniqueKBCategories = new Set(articles?.map((article) => article?.kb_metadata?.kb_category));

    const categoryOptions: SelectOption[] = Array.from(uniqueKBCategories)?.map((kb_category) => ({ label: kb_category, value: kb_category }));

    const columns = useMemo(() => {
        let cols: number;
        if (screenSizeLessThen('md')) cols = 1;
        else if (screenSizeGreaterThen('2xl')) cols = 3;
        else if (screenSizeGreaterThen('md')) cols = 2;
        else cols = originalCols;

        return Math.min(cols, articles.length);
    }, [screenSizeLessThen, screenSizeGreaterThen, originalCols, articles.length]);

    const rows = useMemo(
        () => Array.from({ length: Math.ceil(articles.length / columns) }, (_, i) => filteredArticles.slice(i * columns, i * columns + columns)),
        [filteredArticles, columns],
    );

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 280,
        overscan: 5,
        getItemKey: (index) => rows[index][0]?.kb_metadata?.number ?? index,
    });

    const handleKbArticleClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const card = (event.target as HTMLElement).closest('[data-kb-id]');
            const kbArticleNumber = card?.getAttribute('data-kb-id');
            if (!kbArticleNumber) return;
            onSelect?.(kbArticleNumber);
        },
        [onSelect],
    );

    const rowContent = useCallback(
        (row: KnowledgeArticle[], rowIndex: number) => (
            <div key={rowIndex} className="flex gap-3 pb-3">
                {row.map((article) => (
                    <div
                        data-kb-id={article.kb_metadata.number}
                        key={article.kb_metadata.number}
                        className="flex cursor-pointer"
                        style={{ width: `calc((100% - (${columns} - 1) * 0.75rem) / ${columns})` }}
                    >
                        <KBArticleCard config={kbCardConfig} error={null} article={article} className="w-full" />
                    </div>
                ))}
                {/* Fill remaining slots in last row so cards don't stretch */}
                {row.length < columns &&
                    Array.from({ length: columns - row.length }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ width: `calc((100% - (${columns} - 1) * 0.75rem) / ${columns})` }} />
                    ))}
            </div>
        ),
        [columns, kbCardConfig],
    );

    if (isLoading) return <GridSkeleton rows={3} cols={2} className="p-2" />;
    if (isError) return <ErrorPlaceholder iconSize={100} title={errorTitle} error={error} onRetry={() => onRefetch?.()} isRefetching={isRefetching} />;
    if (!articles?.length) return <EmptyPlaceholder iconSize={100} isRefetching={isRefetching} message={noDataTitle ?? 'No articles found'} />;

    return (
        <div className="flex flex-col h-full w-full min-h-0 relative">
            {/* Toolbar - search + category multiselect filter (fixed on top) */}
            {showArticleSearch ? (
                <div className="flex items-center justify-end gap-2 px-6 pb-2 shrink-0">
                    <div className="w-full max-w-xs">
                        <FormField
                            value={filters.search}
                            onChange={(value) => setFilters((prev) => ({ ...prev, search: typeof value === 'string' ? value : '' }))}
                            variant="standard"
                            label=""
                            labelClassName={labelClassName}
                            errorClassName={errorClassName}
                            errorMinHeight={0}
                        >
                            {({ value, onChange, onBlur, onFocus, id }) => (
                                <TextInput
                                    id={id}
                                    value={value as string}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    onFocus={onFocus}
                                    placeholder="Search KB Number / Title"
                                    className={twMerge(inputClassName, 'py-3.5')}
                                    data-field="search"
                                />
                            )}
                        </FormField>
                    </div>
                    <div className="w-56 shrink-0">
                        <FormField
                            value={filters?.categories}
                            onChange={(value) => setFilters((prev) => ({ ...prev, categories: Array.isArray(value) ? value : [] }))}
                            variant="standard"
                            label=""
                            labelClassName={labelClassName}
                            errorClassName={errorClassName}
                            errorMinHeight={0}
                        >
                            {({ value, onChange }) => (
                                <MultiSelectInput
                                    value={(value as string[]) ?? ([] as string[])}
                                    onChange={onChange as (v: string[]) => void}
                                    placeholder="Select categories"
                                    options={categoryOptions}
                                    triggerClassName={selectTriggerClassName}
                                    data-field="categories"
                                    maxChips={1}
                                />
                            )}
                        </FormField>
                    </div>
                </div>
            ) : null}

            {/* Scrollable List Container */}
            <div ref={parentRef} className="overflow-y-auto min-h-0 p-3 pt-0 relative flex-1" onClick={handleKbArticleClick}>
                {filteredArticles?.length <= 0 ? <EmptyPlaceholder iconSize={250} message="No Articles found with the selected filters !" /> : null}
                <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {virtualizer.getVirtualItems().map((virtualRow) => (
                        <div
                            key={virtualRow.key}
                            ref={virtualizer.measureElement}
                            data-index={virtualRow.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {rowContent(rows[virtualRow.index], virtualRow.index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KBArticlesList;
