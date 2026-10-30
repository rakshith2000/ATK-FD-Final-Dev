import type { UseQueryResult } from '@tanstack/react-query';
import type React from 'react';
import type { KBCatalogAnalytics } from '../../../types';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import ImageWithUnknownExt from '@/shared/components/ui/ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';

interface LowScoringArticlesProps {
    knowledgeArticlesQuery: UseQueryResult<KBCatalogAnalytics, Error>;
    onClick?: () => void;
}

const LowScoringArticles: React.FC<LowScoringArticlesProps> = ({ knowledgeArticlesQuery, onClick }) => {
    const { isLoading, isError, error, isRefetching, data, refetch } = knowledgeArticlesQuery;

    if (isLoading) return <GridSkeleton rows={1} cols={1} height={90} />;
    if (isError) return <ErrorPlaceholder error={error} iconSize={100} onRetry={refetch} isRefetching={isRefetching} />;

    return (
        <div
            onClick={onClick}
            className="h-[85%] w-full max-w-[45%] lg:max-w-[30%] shadow rounded-md overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 cursor-pointer brand-box-show-inset brand-box-show-inset-only-hover hover:border-t-4 hover:border-t-(--brand-color) border-(--brand-bg-color) border"
        >
            <div className="h-full px-4 py-2 flex flex-col gap-1.5 justify-center items-center">
                <span className="text-(--brand-title-primary-color) font-bold text-xl leading-none">{data?.lowScoringArticlesCount ?? 0}</span>
                <div className="flex flex-col items-center gap-0.5 text-(--brand-header-title-color)">
                    <div className="flex items-center gap-2">
                        <ImageWithUnknownExt
                            baseSrcWithoutFileExtension={resolvePublicAssetPath('/assets/knowledge-ai/knowledge-quality-analysis-icons/Thumbs Down')}
                            alt="Thumbs Down"
                            fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                            style={{ width: 15, height: 15 }}
                        />
                        <p className="font-bold text-xs">Low Scoring Articles</p>
                    </div>
                    <p className="font-normal text-xs opacity-70">Articles rated below 3 stars</p>
                </div>
            </div>
        </div>
    );
};

export default LowScoringArticles;
