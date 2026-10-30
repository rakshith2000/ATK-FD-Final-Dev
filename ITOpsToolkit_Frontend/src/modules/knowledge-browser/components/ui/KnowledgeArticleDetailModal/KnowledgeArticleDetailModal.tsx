import { twMerge } from 'tailwind-merge';
import Modal, { type ModalProps } from '@/shared/components/ui/Modal/Modal';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import RichTextEditor, { RichTextEditorContent, type RichTextEditorActions } from '@/shared/modules/rich-text-editor';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import type { KnowledgeArticle } from '../../../types/knowledge-browser';
import { formatArticleDate, getArticleKey } from '../../../utils/article-format';
import { Check, ClipboardCopy } from 'lucide-react';
import { useCopyText } from '@/shared/hooks/useCopyText';
import { useRef } from 'react';
import KBArticleAIScore from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/KBArticleAIScore/KBArticleAIScore';

/** Keycloak group whose members are allowed to refine an article. */
const REFINE_ARTICLE_GROUP = '/transition-ai/knowledge-ai/refineArticle';

interface KnowledgeArticleDetailModalProps {
    article: KnowledgeArticle | null;
    onClose: () => void;
    /** Invoked when the user clicks "Refine Article"; opens the refinement popup. */
    onRefine?: (article: KnowledgeArticle) => void;
}

/** Fixed size for the knowledge article details popup. */
const MODAL_SIZE: ModalProps['size'] = 'full';

/** Rating pill, colour-coded by score, matching the Knowledge AI article popup. */
const ArticleRatingBadge = ({ rating }: { rating: string | null | undefined }) => {
    const num = parseFloat(rating ?? '') || 0;
    const color =
        num >= 4
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : num >= 3
              ? 'text-amber-700 bg-amber-50 border border-amber-200'
              : 'text-rose-700 bg-rose-50 border border-rose-200';
    return <span className={twMerge('min-w-max rounded px-1.5 py-0.5 text-xs font-semibold', color)}>Rating : ★ {num}</span>;
};

const KnowledgeArticleDetailModal: React.FC<KnowledgeArticleDetailModalProps> = ({ article, onClose, onRefine }) => {
    const { hasGroupMembership } = useAuth();
    const canRefine = hasGroupMembership(REFINE_ARTICLE_GROUP);

    const { copied: htmlCopied, copy: copyHtml } = useCopyText(5000);

    const editorActionsRef = useRef<RichTextEditorActions>(null);

    if (!article) return null;

    const html = article.text?.value ?? article.text?.display_value ?? '';
    const number = article.number?.display_value?.trim();
    const title = article.short_description?.display_value?.trim();
    const author = article.author?.display_value?.trim();
    const category = article.kb_category?.display_value?.trim();

    return (
        <Modal open={!!article} onClose={onClose} size={MODAL_SIZE} className="p-0">
            {/* Header - brand colour bar, matching the Knowledge AI article popup */}
            <Modal.Header className="mb-0 border-b-(--brand-color) bg-(--brand-color) p-2 text-sm font-semibold text-(--brand-text-inverse) 2xl:text-base">
                Article Details
            </Modal.Header>

            {/* Body - card-style metadata header + read-only rich text content */}
            <Modal.Body className="m-0 px-0 py-2">
                <ShellLayout className="gap-4 rounded-md border-none p-4 shadow-none">
                    <ShellLayout.Header className="flex flex-col gap-0">
                        {/* Row 1 - number : title + rating */}
                        <div className="flex w-full flex-1 items-start justify-between gap-0.5">
                            <h1 className="text-sm font-bold text-(--brand-title-primary-color)">
                                {number ? `${number} : ` : ''}
                                {title}
                            </h1>
                            <div className="flex gap-2">
                                <ArticleRatingBadge rating={article.rating?.display_value} />
                                <KBArticleAIScore getScoreBy="number" KBContent={article.text.value ?? ''} KBNumber={article.number.value || ''} />
                            </div>
                        </div>
                        {/* Row 2 - author, category, created date */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold">
                            {author && <span>By {author}</span>}
                            {category && <span className="font-normal text-gray-500">{category}</span>}
                            <span className="font-normal text-gray-400">{formatArticleDate(article.sys_created_on?.display_value)}</span>
                        </div>
                    </ShellLayout.Header>

                    <ShellLayout.Body className="text-xs text-(--brand-text-color)">
                        {html ? (
                            <RichTextEditor
                                key={getArticleKey(article)}
                                initialHtml={html}
                                actionsRef={editorActionsRef}
                                isEditable={false}
                                extensions={{ textCase: false }}
                                preserveInitialHtml={{ classes: true, head: true, styles: true }}
                                className="my-0 w-full rounded-none border-none pl-2 pt-0 shadow-none"
                                isSnowRelated
                                snowSysId={article?.sys_id?.value || ''}
                                snowTableName="kb_knowledge"
                            >
                                <RichTextEditorContent className={twMerge('min-h-20', 'max-h-[65dvh]')} />
                            </RichTextEditor>
                        ) : (
                            <p className="p-4 text-xs text-gray-400">No content available for this article.</p>
                        )}
                    </ShellLayout.Body>
                </ShellLayout>
            </Modal.Body>

            {onRefine && canRefine && (
                <Modal.Footer className="flex items-center justify-center p-2">
                    <Modal.ActionButton variant="brand" onClick={() => onRefine(article)} className="w-[50%] max-w-40">
                        Refine Article
                    </Modal.ActionButton>
                    <Modal.ActionButton
                        onClick={() => {
                            const html = editorActionsRef.current?.copyHtml() ?? '';
                            if (html) copyHtml(html);
                        }}
                        variant="ghost"
                        className="w-[50%] max-w-40"
                        disabled={htmlCopied}
                    >
                        {htmlCopied ? <Check size={12} className="text-green-600" /> : <ClipboardCopy size={12} />}
                        {htmlCopied ? 'Copied!' : 'Copy HTML'}
                    </Modal.ActionButton>
                </Modal.Footer>
            )}
        </Modal>
    );
};

export default KnowledgeArticleDetailModal;
