import { Search, X } from 'lucide-react';
import { ErrorPlaceholder, EmptyPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import { useKnowledgeArticleCountsByCategoryQuery } from '../../../hooks/useKnowledgeArticlesQuery';
import { useUserKnowledgeBaseIds } from '../../../hooks/useUserKnowledgeBaseIds';
import { useKnowledgeArticlesByCategoryInfiniteQuery } from '../../../hooks/useKnowledgeArticlesByCategoryInfiniteQuery';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import KnowledgeCategoryListItem from '../../ui/KnowledgeCategoryListItem/KnowledgeCategoryListItem';
import KnowledgeArticleCard from '../../ui/KnowledgeArticleCard/KnowledgeArticleCard';
import KnowledgeArticleDetailModal from '../../ui/KnowledgeArticleDetailModal/KnowledgeArticleDetailModal';
import KnowledgeArticleRefineModal from '../KnowledgeArticleRefineModal/KnowledgeArticleRefineModal';
import type { KnowledgeArticle } from '@/shared/modules/servicenow/types/knowledge';

interface KnowledgeBrowserProps {
    initialCategory?: string;
}

const KnowledgeBrowser: React.FC<KnowledgeBrowserProps> = () => {
    const location = useLocation();
    const categoriesQuery = useKnowledgeArticleCountsByCategoryQuery();
    const categories = categoriesQuery.data ?? [];

    const [selectedCategorySysId, setSelectedCategorySysId] = useState<string | null>(null);
    const [isCategorySelected, setIsCategorySelected] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
    const [refiningArticle, setRefiningArticle] = useState<KnowledgeArticle | null>(null);
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const [articleSearchTerm, setArticleSearchTerm] = useState('');

    const kbIdsQuery = useUserKnowledgeBaseIds();
    const knowledgeBaseIds = kbIdsQuery.data ?? [];

    // For Uncategorised, wait for KB IDs to load. For other categories, can proceed immediately.
    const shouldFetchArticles = isCategorySelected && (selectedCategorySysId !== null || knowledgeBaseIds.length > 0);

    const articlesQuery = useKnowledgeArticlesByCategoryInfiniteQuery(selectedCategorySysId, shouldFetchArticles, knowledgeBaseIds);
    const allArticles = articlesQuery.data?.pages.flatMap((page) => page) ?? [];

    const parentRef = useRef<HTMLDivElement>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTriggerIndexRef = useRef<number | null>(null);

    // Reset trigger ref when category changes
    useEffect(() => {
        lastTriggerIndexRef.current = null;
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    }, [selectedCategorySysId]);

    // Auto-select category from search params or set default
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const selectedCategory = searchParams.get('selectedCategory');
        if (selectedCategory !== null && selectedCategory !== undefined) {
            // Handle empty string as null (Uncategorised)
            const categoryId = selectedCategory === '' ? null : selectedCategory;
            setSelectedCategorySysId(categoryId);
            setIsCategorySelected(true);
        } else if (categories.length > 0 && !isCategorySelected) {
            // Select the first non-Uncategorised category or the first one
            const firstCategory = categories.find((cat) => cat.categoryName !== 'Uncategorised') || categories[0];
            setSelectedCategorySysId(firstCategory.categorySysId);
            setIsCategorySelected(true);
        }
    }, [categories, isCategorySelected, location.search]);

    const categoryTerm = categorySearchTerm.trim().toLowerCase();
    const sortedCategories = [...categories].sort((a, b) => {
        // Put selected category first (only if selectedCategorySysId is not null)
        if (selectedCategorySysId && a.categorySysId === selectedCategorySysId) return -1;
        if (selectedCategorySysId && b.categorySysId === selectedCategorySysId) return 1;
        // Put Uncategorised at the end
        if (a.categoryName === 'Uncategorised') return 1;
        if (b.categoryName === 'Uncategorised') return -1;
        // Then sort other categories in ascending order (A-Z)
        return a.categoryName.localeCompare(b.categoryName, undefined, { numeric: true, sensitivity: 'base' });
    });
    const visibleCategories = !categoryTerm ? sortedCategories : sortedCategories.filter((cat) => cat.categoryName.toLowerCase().includes(categoryTerm));

    const selectedCategory = categories.find((cat) => cat.categorySysId === selectedCategorySysId);

    const articleTerm = articleSearchTerm.trim().toLowerCase();
    const visibleArticles = !articleTerm
        ? allArticles
        : allArticles.filter((article) =>
              [article.number?.display_value, article.short_description?.display_value, article.author?.display_value].some((field) => field?.toLowerCase().includes(articleTerm)),
          );

    // Group articles into rows of 3 for multi-column layout
    const COLUMNS = 3;
    const articleRows = Array.from({ length: Math.ceil(visibleArticles.length / COLUMNS) }, (_, i) => visibleArticles.slice(i * COLUMNS, (i + 1) * COLUMNS));

    const virtualizer = useVirtualizer({
        count: articleRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 340,
        overscan: 2,
    });

    const virtualItems = virtualizer.getVirtualItems();
    const lastVirtualItemIndex = virtualItems[virtualItems.length - 1]?.index;
    const rowCount = articleRows.length;

    // Infinite scroll: fetch next page when user scrolls near bottom
    useEffect(() => {
        if (lastVirtualItemIndex === undefined || !articlesQuery.hasNextPage || articlesQuery.isFetchingNextPage || rowCount === 0) return;

        // Only fetch if we've scrolled past the threshold AND past the last trigger point
        const shouldFetch = lastVirtualItemIndex >= rowCount - 1;
        const hasMovedPastLastTrigger = lastTriggerIndexRef.current === null || lastVirtualItemIndex > lastTriggerIndexRef.current;

        if (shouldFetch && hasMovedPastLastTrigger) {
            lastTriggerIndexRef.current = lastVirtualItemIndex;

            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = setTimeout(() => {
                articlesQuery.fetchNextPage();
            }, 200);
        }
    }, [lastVirtualItemIndex, rowCount, articlesQuery.hasNextPage, articlesQuery.isFetchingNextPage, articlesQuery.fetchNextPage]);

    const handleCategorySelect = (categoryName: string) => {
        const category = categories.find((cat) => cat.categoryName === categoryName);
        setSelectedCategorySysId(category?.categorySysId || null);
        setIsCategorySelected(true);
    };

    if (categoriesQuery.isLoading) return <LoadingPlaceholder message="Loading knowledge categories" />;
    if (categoriesQuery.isError) return <ErrorPlaceholder error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} isRefetching={categoriesQuery.isRefetching} />;
    if (categories.length === 0)
        return <EmptyPlaceholder message="No knowledge categories found" onRetry={() => categoriesQuery.refetch()} isRefetching={categoriesQuery.isRefetching} />;

    return (
        <div className="grid h-full w-full grid-cols-1 gap-2 p-2 lg:grid-cols-[240px_1fr] lg:overflow-hidden">
            {/* Left - Categories */}
            <aside className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white shadow-xs">
                {/* Category search */}
                <div className="flex-none p-2">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={categorySearchTerm}
                            onChange={(e) => setCategorySearchTerm(e.target.value)}
                            placeholder="Search categories..."
                            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-600 outline-none transition-colors focus:border-(--brand-title-primary-color)"
                        />
                        {categorySearchTerm && (
                            <button
                                type="button"
                                onClick={() => setCategorySearchTerm('')}
                                aria-label="Clear category search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category list */}
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2 pt-0">
                    {visibleCategories.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-gray-400">No categories found</p>
                    ) : (
                        visibleCategories.map((cat) => (
                            <KnowledgeCategoryListItem
                                key={cat.categorySysId || 'uncategorised'}
                                category={cat.categoryName}
                                count={cat.count}
                                isSelected={cat.categoryName === selectedCategory?.categoryName}
                                onSelect={handleCategorySelect}
                            />
                        ))
                    )}
                </div>
            </aside>

            {/* Right - Articles */}
            <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
                {/* Header - count badge + search */}
                <div className="flex flex-none items-center justify-between gap-2">
                    <span className="rounded-md bg-(--brand-title-primary-color) px-3 py-1.5 text-xs font-semibold text-white">
                        {selectedCategory ? `${selectedCategory.categoryName} Count: ${selectedCategory.count}` : 'Select a category'}
                    </span>
                    {selectedCategorySysId && (
                        <div className="relative w-full max-w-xs">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={articleSearchTerm}
                                onChange={(e) => setArticleSearchTerm(e.target.value)}
                                placeholder="Search articles..."
                                className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-600 outline-none transition-colors focus:border-(--brand-title-primary-color)"
                            />
                            {articleSearchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setArticleSearchTerm('')}
                                    aria-label="Clear article search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Articles grid */}
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
                    {!isCategorySelected ? (
                        <EmptyPlaceholder message="Select a category to view articles" />
                    ) : articlesQuery.isLoading ? (
                        <ListSkeleton rows={6} className="p-2" />
                    ) : articlesQuery.isError ? (
                        <ErrorPlaceholder error={articlesQuery.error} onRetry={() => articlesQuery.refetch()} isRefetching={articlesQuery.isRefetching} />
                    ) : visibleArticles.length === 0 ? (
                        <EmptyPlaceholder message={articleSearchTerm ? 'No articles match your search' : 'No articles in this category'} />
                    ) : (
                        <div className="flex flex-col h-full w-full relative">
                            <div ref={parentRef} className="overflow-y-auto flex-1 w-full relative">
                                <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                                    {virtualItems.map((virtualItem) => {
                                        const row = articleRows[virtualItem.index];
                                        if (!row || row.length === 0) return null;
                                        return (
                                            <div
                                                key={virtualItem.key}
                                                ref={virtualizer.measureElement}
                                                data-index={virtualItem.index}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    transform: `translateY(${virtualItem.start}px)`,
                                                }}
                                                className="p-2"
                                            >
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                    {row.map((article) => (
                                                        <KnowledgeArticleCard key={article.sys_id?.value} article={article} onSelect={setSelectedArticle} />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {articlesQuery.isFetchingNextPage && (
                                <div className="p-3 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-200 shadow-sm shrink-0 z-10 animate-pulse">
                                    Loading more articles...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Article detail popup */}
            <KnowledgeArticleDetailModal
                article={selectedArticle}
                onClose={() => setSelectedArticle(null)}
                onRefine={(article) => {
                    setSelectedArticle(null);
                    setRefiningArticle(article);
                }}
            />

            {/* Refined article details popup */}
            <KnowledgeArticleRefineModal article={refiningArticle} onClose={() => setRefiningArticle(null)} />
        </div>
    );
};

export default KnowledgeBrowser;
