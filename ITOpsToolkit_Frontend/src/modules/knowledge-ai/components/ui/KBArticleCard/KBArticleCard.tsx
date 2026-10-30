import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { KnowledgeArticle } from '@/modules/knowledge-ai/types';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { ArticleSkeleton } from '@/shared/components/ui/Skeletons';
import React from 'react';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import RichTextEditor, { RichTextEditorContent } from '@/shared/modules/rich-text-editor';
import RatingBadge from '@/shared/components/ui/RatingBadge/RatingBadge';
import KBArticleAIScore from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/KBArticleAIScore/KBArticleAIScore';
import type { KBArticleScoringRequest } from '@/shared/modules/atk-backend/types/knowledge-base';

export interface KBArticleCardProps {
    article?: KnowledgeArticle;
    renderWithMarkdown?: boolean;
    renderWithRichtextEditor?: boolean;
    onClick?: (number: string) => void;
    className?: ClassNameValue;
    isLoading?: boolean;
    isError?: boolean;
    error: Error | null;
    config?: {
        showRating?: boolean;
        showAIRating?: boolean;
        showAIRattingBy?: KBArticleScoringRequest['getScoreBy'];
        showCreatedDate?: boolean;
        renderWithMarkdown?: boolean;
        renderWithRichtextEditor?: boolean;
        showContent?: boolean;
    };
}

const KBArticleCard: React.FC<KBArticleCardProps> = ({
    article,
    onClick,
    renderWithMarkdown = false,
    renderWithRichtextEditor = false,
    className,
    isLoading,
    error,
    isError,
    config = {
        showCreatedDate: false,
        showAIRating: true,
        showAIRattingBy: 'number',
        showRating: true,
        showContent: true,
        renderWithMarkdown: false,
        renderWithRichtextEditor: false,
    },
}) => {
    if (isLoading) return <ArticleSkeleton VW={800} className="p-4" />;
    if (isError) return <ErrorPlaceholder error={error} />;
    if (!article) return <EmptyPlaceholder message="No Data" />;

    const { kb_metadata: metadata, content } = article;

    const handleClick = () => {
        onClick?.(article?.kb_metadata.number);
    };

    return (
        <div data-kb-number={article?.kb_metadata?.number} onClick={handleClick} className={twMerge('max-h-[70dvh]', className)} role="button">
            <ShellLayout className="p-4 rounded-md gap-4 border-(--brand-border-color)">
                <ShellLayout.Header className="flex flex-col gap-0">
                    {/* Row 1 */}
                    <div className="w-full gap-0.5 flex justify-between items-start flex-1">
                        <h1 className="text-sm font-bold text-(--brand-title-primary-color)">
                            {metadata?.number} : {metadata?.title}
                        </h1>
                        <div className="w-full gap-1.5 flex justify-end items-start flex-1">
                            {config?.showRating ? <RatingBadge rating={metadata?.rating} /> : null}
                            {config?.showAIRating ? (
                                <KBArticleAIScore score={metadata?.ai_score} KBContent={content} KBNumber={metadata?.number} getScoreBy={config.showAIRattingBy || 'number'} />
                            ) : null}
                            {config?.showCreatedDate ? <span className="text-xs font-bold">Date: {article?.kb_metadata?.kb_knowledge_base}</span> : null}
                        </div>
                    </div>
                    {/* Row 2 */}
                    <span className="text-xs font-bold">By {metadata?.author}</span>
                </ShellLayout.Header>
                {config.showContent ? (
                    <ShellLayout.Body className={twMerge('text-xs text-(--brand-text-color)', renderWithMarkdown ? '' : 'whitespace-pre-wrap')}>
                        {renderWithMarkdown || config?.renderWithMarkdown ? <RenderMarkdown text={content} /> : null}

                        {renderWithRichtextEditor || config?.renderWithRichtextEditor ? (
                            <RichTextEditor
                                initialHtml={content}
                                isEditable={false}
                                extensions={{
                                    textCase: false,
                                }}
                                preserveInitialHtml={{
                                    classes: true,
                                    head: true,
                                    styles: true,
                                }}
                                className="border-none w-full shadow-none rounded-none my-0 pl-2 pt-0"
                            >
                                <RichTextEditorContent className="min-h-20 max-h-100" />
                            </RichTextEditor>
                        ) : null}

                        {!renderWithMarkdown && !config?.renderWithMarkdown && !renderWithRichtextEditor && !config.renderWithRichtextEditor ? <>{content}</> : null}
                    </ShellLayout.Body>
                ) : null}
            </ShellLayout>
        </div>
    );
};

KBArticleCard.displayName = 'KBArticleCard';

export default KBArticleCard;
