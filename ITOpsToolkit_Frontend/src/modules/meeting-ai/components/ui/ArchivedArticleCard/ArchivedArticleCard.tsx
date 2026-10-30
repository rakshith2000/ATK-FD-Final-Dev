import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Archive } from 'lucide-react';
import type { ArchivedArticle } from '@/modules/meeting-ai/types/meeting-ai';
import { formatMeetingDate } from '@/modules/meeting-ai/utils/format-meeting-date';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';

export interface ArchivedArticleCardProps {
    article: ArchivedArticle;
    className?: ClassNameValue;
}

const ArchivedArticleCard: React.FC<ArchivedArticleCardProps> = ({ article, className }) => {
    return (
        <div className={twMerge('rounded-md border border-gray-200 bg-white p-3 shadow-sm', className)}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                    <Archive size={14} className="text-(--brand-color)" />
                    <span className="text-sm font-bold text-(--brand-title-primary-color)">{article.title}</span>
                </div>
                {article.created_at && <span className="text-xs text-gray-500">{formatMeetingDate(article.created_at, { withTime: true, fallback: '' })}</span>}
            </div>
            <RenderMarkdown text={article.content ?? ''} />
        </div>
    );
};

ArchivedArticleCard.displayName = 'ArchivedArticleCard';

export default ArchivedArticleCard;
