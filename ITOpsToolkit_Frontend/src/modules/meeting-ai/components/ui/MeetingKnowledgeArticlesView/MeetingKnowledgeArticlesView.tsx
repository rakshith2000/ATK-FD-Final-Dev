import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Archive, Plus } from 'lucide-react';
import type { MeetingKnowledgeArticle } from '@/modules/meeting-ai/types/meeting-ai';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';

export interface MeetingKnowledgeArticlesViewProps {
    articles?: MeetingKnowledgeArticle[];
    onViewArchived?: () => void;
    onCreateKb?: (article: MeetingKnowledgeArticle) => void;
    isLoading?: boolean;
    className?: ClassNameValue;
}

const MeetingKnowledgeArticlesView: React.FC<MeetingKnowledgeArticlesViewProps> = ({ articles, onViewArchived, onCreateKb, isLoading, className }) => {
    const hasArticles = !!articles?.length;
    const archivedDisabled = isLoading || !hasArticles;

    return (
        <div className={twMerge('flex flex-col gap-3', className)}>
            {onViewArchived && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onViewArchived}
                        disabled={archivedDisabled}
                        className="inline-flex items-center gap-1 btn-split split-white-blue-light rounded soft-drop-shadow px-3 py-1 text-xs font-semibold cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="inline-flex items-center gap-1">
                            <Archive size={12} />
                            View Archived Article
                        </span>
                    </button>
                </div>
            )}

            {hasArticles ? (
                <div className="flex flex-col gap-2">
                    {articles!.map((article, idx) => (
                        <div key={`${article.title}-${idx}`} className="rounded-md border border-(--brand-border-color) bg-white p-3 brand-box-show-inset">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="text-sm font-bold text-black">{article.title}</div>
                                {onCreateKb && (
                                    <button
                                        type="button"
                                        onClick={() => onCreateKb(article)}
                                        className="inline-flex items-center gap-1 rounded text-white px-3 py-1 text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform btn-split split-blue shrink-0"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            <Plus size={12} />
                                            Create KB
                                        </span>
                                    </button>
                                )}
                            </div>
                            <RenderMarkdown text={article.content ?? ''} />
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyPlaceholder message="No knowledge articles available" />
            )}
        </div>
    );
};

MeetingKnowledgeArticlesView.displayName = 'MeetingKnowledgeArticlesView';

export default MeetingKnowledgeArticlesView;
