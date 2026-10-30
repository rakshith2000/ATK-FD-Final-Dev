import { memo } from 'react';
import { Star } from 'lucide-react';
import type { KnowledgeArticle } from '../../../types/knowledge-browser';
import { formatArticleDate, formatArticleRating, htmlToPreviewText } from '../../../utils/article-format';

interface KnowledgeArticleCardProps {
    article: KnowledgeArticle;
    onSelect: (article: KnowledgeArticle) => void;
}

const KnowledgeArticleCard: React.FC<KnowledgeArticleCardProps> = memo(
    ({ article, onSelect }) => {
        const rating = formatArticleRating(article.rating?.display_value);

        return (
            <button
                type="button"
                onClick={() => onSelect(article)}
                className="flex h-full w-full flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
            >
                {/* Row 1 - Number + Author (left), Rating (right) */}
                <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-(--brand-header-title-color)">
                        {article.number?.display_value}
                        {article.author?.display_value?.trim() && <span className="font-normal text-gray-400"> - {article.author.display_value.trim()}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-500">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {rating}
                    </span>
                </div>

                {/* Row 2 - Short description + created date */}
                <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-[0.72rem] font-medium text-gray-700">{article.short_description?.display_value}</p>
                    <span className="shrink-0 text-[0.62rem] text-gray-400">{formatArticleDate(article.sys_created_on?.display_value)}</span>
                </div>

                {/* Row 3 - Category chip */}
                <span className="w-fit rounded-full bg-(--brand-title-primary-color)/10 px-2 py-0.5 text-[0.6rem] font-medium text-(--brand-title-primary-color)">
                    {article.kb_category?.display_value}
                </span>

                {/* Row 4 - Body preview */}
                <p className="line-clamp-2 text-[0.68rem] leading-relaxed text-gray-500">{htmlToPreviewText(article.text?.display_value)}</p>
            </button>
        );
    },
    (prev, next) => prev.article === next.article && prev.onSelect === next.onSelect,
);

KnowledgeArticleCard.displayName = 'KnowledgeArticleCard';
export default KnowledgeArticleCard;
