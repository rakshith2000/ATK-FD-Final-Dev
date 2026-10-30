import type { UseQueryResult } from '@tanstack/react-query';
import type React from 'react';
import type { DuplicateKBCatalogAnalytics } from '../../../types';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import ImageWithUnknownExt from '@/shared/components/ui/ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';

interface DuplicateArticlesProps {
    duplicateKnowledgeArticlesQuery: UseQueryResult<DuplicateKBCatalogAnalytics, Error>;
    onClick?: () => void;
}

const DuplicateArticles: React.FC<DuplicateArticlesProps> = ({ duplicateKnowledgeArticlesQuery, onClick }) => {
    const { isLoading, isError, error, isRefetching, data, refetch } = duplicateKnowledgeArticlesQuery;

    if (isLoading) return <GridSkeleton rows={1} cols={1} height={90} />;
    if (isError) return <ErrorPlaceholder error={error} onRetry={refetch} iconSize={100} isRefetching={isRefetching} />;

    return (
        <div
            onClick={onClick}
            className="h-[85%] w-full max-w-[45%] lg:max-w-[30%] shadow rounded-md overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 cursor-pointer brand-box-show-inset brand-box-show-inset-only-hover hover:border-t-4 hover:border-t-(--brand-color) border-(--brand-bg-color) border"
        >
            <div className="h-full px-1 py-1 flex flex-col gap-1.5 justify-center items-center">
                <span className="text-(--brand-title-primary-color) font-bold text-xl leading-none">{data?.duplicateArticlesCount ?? 0}</span>
                <div className="flex flex-col items-center gap-0.5 text-sm 2xl:text-sm text-(--brand-header-title-color)">
                    <div className="flex items-center gap-2">
                        <ImageWithUnknownExt
                            baseSrcWithoutFileExtension={resolvePublicAssetPath('/assets/knowledge-ai/knowledge-quality-analysis-icons/Duplicate')}
                            alt="Duplicate"
                            fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                            style={{ width: 15, height: 15 }}
                        />
                        <p className="font-bold text-xs">Duplicate Articles</p>
                    </div>
                    <p className="font-normal text-xs 2xl:text-sm opacity-70">Articles with similar context</p>
                </div>
            </div>
        </div>
    );
};

export default DuplicateArticles;
