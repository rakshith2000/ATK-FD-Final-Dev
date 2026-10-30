import { memo } from 'react';
import { twMerge } from 'tailwind-merge';
import ImageWithUnknowExt from '@/shared/components/ui/ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';

interface KnowledgeCategoryListItemProps {
    category: string;
    count: number;
    isSelected?: boolean;
    onSelect: (category: string) => void;
}

/**
 * A single category row in the Knowledge Browser's left-hand category list.
 *
 * Renders a per-category icon (resolved by category name from the shared
 * knowledge-category icon set, falling back to a placeholder) alongside the
 * category name and its article count. Scoped to the knowledge browser so its
 * icon + count layout can evolve independently of other category lists.
 */
const KnowledgeCategoryListItem: React.FC<KnowledgeCategoryListItemProps> = memo(
    ({ category, count, isSelected = false, onSelect }) => (
        <button
            type="button"
            title={category}
            onClick={() => onSelect(category)}
            className={twMerge(
                'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-all duration-200 cursor-pointer',
                'brand-border-left-only-hover brand-box-show-inset-only-hover',
                isSelected && 'brand-border-left brand-box-show-inset',
            )}
        >
            <span className="flex min-w-0 items-center gap-2">
                <ImageWithUnknowExt
                    baseSrcWithoutFileExtension={resolvePublicAssetPath(`/assets/knowledge-ai/knowledge-category-icons/${category}`)}
                    alt={category}
                    fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                    style={{ width: 16, height: 16 }}
                />
                <span className={twMerge('truncate text-xs font-medium text-gray-600', isSelected && 'font-semibold text-(--brand-title-primary-color)')}>{category}</span>
            </span>
            <span
                className={twMerge(
                    'shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[0.6rem] font-semibold text-gray-500',
                    isSelected && 'bg-(--brand-title-primary-color)/10 text-(--brand-title-primary-color)',
                )}
            >
                {count}
            </span>
        </button>
    ),
    (prev, next) => prev.category === next.category && prev.count === next.count && prev.isSelected === next.isSelected && prev.onSelect === next.onSelect,
);

KnowledgeCategoryListItem.displayName = 'KnowledgeCategoryListItem';
export default KnowledgeCategoryListItem;
