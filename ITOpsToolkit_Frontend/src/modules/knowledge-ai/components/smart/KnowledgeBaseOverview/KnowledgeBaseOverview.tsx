import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import type React from 'react';
import KBCategoryCountBadge from '../../ui/KBCategoryCountBadge/KBCategoryCountBadge';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import type { UseQueryResult } from '@tanstack/react-query';
import logger from '@/shared/utils/logger';
import { useNavigate } from '@tanstack/react-router';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { KnowledgeArticlesCatalog } from '@/shared/modules/servicenow/types/knowledge';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';

interface KnowledgeBaseOverviewProps {
    knowledgeArticlesQuery: UseQueryResult<KnowledgeArticlesCatalog, Error>;
    className?: ClassNameValue;
}

const KnowledgeBaseOverview: React.FC<KnowledgeBaseOverviewProps> = ({ knowledgeArticlesQuery, className }) => {
    const navigate = useNavigate();
    const { data, isLoading, isError, isRefetching, error, refetch } = knowledgeArticlesQuery;

    const { scrollContainerRef, canScrollRight, canScrollLeft, scrollLeft, scrollRight } = useScrollOverflow({
        direction: 'horizontal',
        scrollDistance: 300,
    });

    const handleCategoryClick = (categoryName: string, categorySysId: string | null) => {
        if (!categoryName) return;
        logger.debug('handleCategoryBadgeClick', { categoryName, categorySysId });

        navigate({
            viewTransition: true,
            to: '/transition-ai/knowledge-browser',
            search: {
                selectedCategory: categorySysId || '',
                categoryName: categoryName,
            },
        });
    };

    return (
        <ShellLayout className={twMerge('w-full border-none rounded p-1 gap-1.5 shadow-xs', className)}>
            <ShellLayout.Header className="flex justify-between items-center h-5 text-xs text-(--brand-header-title-color) font-bold pr-4">
                <TitleWithArraow className="uppercase text-xs font-extrabold" title="Knowledge Base Overview" />
                <div className="flex justify-center items-stretch gap-1">
                    {!isLoading && !isError && <span>Total Articles: {data?.articlesCount}</span>}
                    <RefetchButton iconSize={14} isRefetching={isRefetching} onRefetch={refetch} />
                </div>
            </ShellLayout.Header>

            <ShellLayout.Body className="relative py-1.5 flex items-center w-full">
                <button
                    onClick={() => scrollLeft()}
                    className={twMerge(
                        'shrink-0 absolute! left-0 cursor-pointer btn-split split-blue-light shadow p-1.5 rounded-full z-10 transition-opacity',
                        !canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-100',
                    )}
                >
                    <span>
                        <FaChevronLeft size={12} />
                    </span>
                </button>

                <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar flex-1 w-full h-full flex items-center px-4">
                    {isLoading && <GridSkeleton cols={10} rows={1} height="90px" />}
                    {isError && <ErrorPlaceholder error={error} isRefetching={isRefetching} iconSize={100} onRetry={refetch} />}
                    {!isLoading && !isError && !data?.articlesCount && <EmptyPlaceholder isRefetching={isRefetching} onRetry={refetch} />}

                    {!isLoading && !isError && !!data?.articlesCount && (
                        <div className="flex flex-nowrap gap-2 h-[85%] w-max">
                            {data.categories.map((kbCategory) => {
                                const category = kbCategory.category?.trim() || 'Others';
                                return (
                                    <button
                                        key={kbCategory.categoryId}
                                        onClick={() => handleCategoryClick(category, kbCategory.categoryId)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        type="button"
                                    >
                                        <KBCategoryCountBadge category={category} count={kbCategory.articlesCount} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => scrollRight()}
                    className={twMerge(
                        'shrink-0 absolute! right-0 cursor-pointer btn-split split-blue-light shadow p-1.5 rounded-full z-10 transition-opacity',
                        !canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-100',
                    )}
                >
                    <span>
                        <FaChevronRight size={12} />
                    </span>
                </button>
            </ShellLayout.Body>
        </ShellLayout>
    );
};

export default KnowledgeBaseOverview;
