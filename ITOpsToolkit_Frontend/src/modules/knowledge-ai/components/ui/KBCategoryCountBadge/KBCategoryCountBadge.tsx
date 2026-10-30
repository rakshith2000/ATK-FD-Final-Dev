import ImageWithUnknowExt from '@/shared/components/ui/ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';
import type React from 'react';

interface KBCategoryCountBadgeProps {
    count: number;
    category: string;
}

const KBCategoryCountBadge: React.FC<KBCategoryCountBadgeProps> = ({ category, count }) => (
    <div
        id={category}
        data-category={category}
        className="h-full shadow rounded-md overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 cursor-pointer brand-box-show-inset brand-box-show-inset-only-hover hover:border-t-4 hover:border-t-(--brand-color) border-(--brand-bg-color) border"
    >
        <div className="h-full min-w-40 px-5 py-2 flex flex-col gap-2 justify-center items-center">
            <span className="text-(--brand-title-primary-color) font-bold text-xl 2xl:text-2xl leading-none">{count}</span>
            <div className="flex items-center gap-2">
                <ImageWithUnknowExt
                    baseSrcWithoutFileExtension={resolvePublicAssetPath(`/assets/knowledge-ai/knowledge-category-icons/${category}`)}
                    alt={category}
                    fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                    style={{ width: 18, height: 18 }}
                />
                <p className="text-(--brand-text-color) font-semibold text-xs 2xl:text-sm whitespace-nowrap">{category}</p>
            </div>
        </div>
    </div>
);

export default KBCategoryCountBadge;
