import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CheckCircle, ClipboardCopy, ExternalLink, Pencil, Save, Undo2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Modal, { type ModalProps } from '@/shared/components/ui/Modal/Modal';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import GoBackButton from '@/shared/components/ui/GoBackButton/GoBackButton';
import RichTextEditor, { RichTextEditorContent, RichTextEditorToolbar, type RichTextEditorActions } from '@/shared/modules/rich-text-editor';
import { LoadingPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { useCopyText } from '@/shared/hooks/useCopyText';
import { useRefineKbArticleMutation } from '../../../hooks/useRefineKbArticleMutation';
import type { KnowledgeArticle } from '../../../types/knowledge-browser';
import { getArticleKey } from '../../../utils/article-format';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import UpdateKBArticleForm from '@/shared/modules/servicenow/components/smart/UpdateKBArticelForm/UpdateKBArticelForm';
import CreateKBArticleForm from '@/shared/modules/servicenow/components/smart/CreateKBArticleForm/CreateKBArticleForm';
import SaveDraftPromptModal from '@/shared/modules/servicenow/components/smart/SaveDraftPromptModal';
import CreateDraftArticleModal from '@/shared/modules/servicenow/components/smart/CreateDraftArticleModal';
import type { CreateKnowledgeArticleResposne, UpdateKnowledgeArticleResposne } from '@/shared/modules/servicenow/types/knowledge';
import { twMerge } from 'tailwind-merge';
import KBArticleAIScore from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/KBArticleAIScore/KBArticleAIScore';

interface KnowledgeArticleRefineModalProps {
    /** The article to refine. When set, the modal opens and refines automatically. */
    article: KnowledgeArticle | null;
    onClose: () => void;
}

type RefineStep = 'refine' | 'save-form' | 'success';

const STEP_TITLES: Record<RefineStep, string> = {
    refine: 'Article Refinement',
    'save-form': 'Save Article',
    success: 'Article Updated',
};

const STEP_SIZES: Record<RefineStep, ModalProps['size']> = {
    refine: 'full',
    'save-form': '2xl',
    success: 'md',
};

/**
 * Knowledge Browser "Refine Article" popup.
 *
 * Mirrors Knowledge AI's RefineArticleModal flow: it calls the same refine
 * endpoint (`{ kb_article }`), shows the refined content in an editable rich-text
 * editor (Edit / Copy HTML), and on "Save Article" walks through the same
 * save-to-ITSM step (pick Knowledge Base + Category -> update endpoint -> success).
 */
const KnowledgeArticleRefineModal: React.FC<KnowledgeArticleRefineModalProps> = ({ article, onClose }) => {
    const queryClient = useQueryClient();
    const refineKbArticleMutation = useRefineKbArticleMutation();

    const [refinedArticleHtml, setRefinedArticleHtml] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [step, setStep] = useState<RefineStep>('refine');
    const [updatedArticle, setUpdatedArticle] = useState<UpdateKnowledgeArticleResposne | CreateKnowledgeArticleResposne | null>(null);

    // States and handlers for image upload ServiceNow draft requirement
    const [createdDraftArticle, setCreatedDraftArticle] = useState<{
        sys_id: string;
        number: string;
        kb_knowledge_base?: string;
        kb_category?: string;
    } | null>(null);
    const currentSysId = createdDraftArticle?.sys_id || article?.sys_id?.value || '';
    const currentNumber = createdDraftArticle?.number || article?.number?.display_value?.trim() || article?.number?.value?.trim() || '';

    const [isDraftPromptOpen, setIsDraftPromptOpen] = useState(false);
    const [isCreateDraftModalOpen, setIsCreateDraftModalOpen] = useState(false);
    const draftResolverRef = useRef<((sysId: string | null) => void) | null>(null);

    const handleRequireSnowRecord = useCallback((): Promise<string | null> => {
        if (currentSysId) {
            return Promise.resolve(currentSysId);
        }
        return new Promise<string | null>((resolve) => {
            draftResolverRef.current = resolve;
            setIsDraftPromptOpen(true);
        });
    }, [currentSysId]);

    const handleCancelDraftPrompt = useCallback(() => {
        setIsDraftPromptOpen(false);
        draftResolverRef.current?.(null);
        draftResolverRef.current = null;
    }, []);

    const handleConfirmDraftPrompt = useCallback(() => {
        setIsDraftPromptOpen(false);
        setIsCreateDraftModalOpen(true);
    }, []);

    const handleCancelCreateDraftModal = useCallback(() => {
        setIsCreateDraftModalOpen(false);
        draftResolverRef.current?.(null);
        draftResolverRef.current = null;
    }, []);

    const handleDraftCreatedSuccess = useCallback(async (data: CreateKnowledgeArticleResposne, values?: { kb_knowledge_base: string; kb_category: string }) => {
        setCreatedDraftArticle({
            number: data.number,
            sys_id: data.sys_id,
            kb_knowledge_base: values?.kb_knowledge_base,
            kb_category: values?.kb_category,
        });
        setIsCreateDraftModalOpen(false);
        draftResolverRef.current?.(data.sys_id);
        draftResolverRef.current = null;
    }, []);

    const editorActionsRef = useRef<RichTextEditorActions>(null);
    const { copied: htmlCopied, copy: copyHtml } = useCopyText(5000);

    const runRefine = () => {
        if (!article) return;
        draftResolverRef.current?.(null);
        draftResolverRef.current = null;
        setIsDraftPromptOpen(false);
        setIsCreateDraftModalOpen(false);
        setCreatedDraftArticle(null);
        setRefinedArticleHtml(null);
        setIsEditing(false);
        setStep('refine');
        setUpdatedArticle(null);
        refineKbArticleMutation.mutate({ kb_article: article?.number?.value || '' }, { onSuccess: (data) => setRefinedArticleHtml(data) });
    };

    // Auto-refine whenever a new article is opened; reset everything on close so
    // re-opening the same article starts a fresh refinement.
    const lastArticleKeyRef = useRef<string | null>(null);
    useEffect(() => {
        if (!article) {
            draftResolverRef.current?.(null);
            draftResolverRef.current = null;
            setIsDraftPromptOpen(false);
            setIsCreateDraftModalOpen(false);
            setCreatedDraftArticle(null);
            lastArticleKeyRef.current = null;
            setRefinedArticleHtml(null);
            setIsEditing(false);
            setStep('refine');
            setUpdatedArticle(null);
            return;
        }
        const key = getArticleKey(article);
        if (lastArticleKeyRef.current === key) return;
        lastArticleKeyRef.current = key;
        runRefine();
    }, [article]);

    useEffect(() => {
        return () => {
            draftResolverRef.current?.(null);
        };
    }, []);

    if (!article) return null;

    const handleSaveEditedContent = (html: string) => {
        setRefinedArticleHtml(html);
        setIsEditing(false);
    };

    const number = article.number?.display_value?.trim() ?? '';
    const title = article.short_description?.display_value?.trim() ?? '';
    const author = article.author?.display_value?.trim();

    const showRefineActions = step === 'refine' && !!refinedArticleHtml && !refineKbArticleMutation.isPending && !refineKbArticleMutation.isError;

    return (
        <>
            <Modal size={STEP_SIZES[step]} open={!!article} onClose={onClose} className="p-0">
                <Modal.Header className="mb-0 border-b-(--brand-color) bg-(--brand-color) p-2 text-sm font-semibold text-(--brand-text-inverse) 2xl:text-base">
                    {STEP_TITLES[step]}
                </Modal.Header>

                <Modal.Body className="m-0 max-h-[80dvh] px-0 py-2">
                    {/* Refine step */}
                    {step === 'refine' ? (
                        refineKbArticleMutation.isPending ? (
                            <LoadingPlaceholder message="Refining article..." />
                        ) : refineKbArticleMutation.isError ? (
                            <ErrorPlaceholder error={refineKbArticleMutation.error} onRetry={runRefine} isRefetching={refineKbArticleMutation.isPending} />
                        ) : refinedArticleHtml ? (
                            <ShellLayout className="border-none shadow-none">
                                <ShellLayout.Header className="flex flex-col gap-0 px-4 pb-0">
                                    <div className="flex w-full flex-1 items-start justify-between gap-0.5">
                                        <h1 className="text-sm font-bold text-(--brand-title-primary-color)">
                                            {number ? `${number} : ` : ''}
                                            {title}
                                        </h1>
                                        <div className="flex flex-row gap-2 justify-between items-center">
                                            <KBArticleAIScore className="max-w-max" KBContent={refinedArticleHtml ?? ''} getScoreBy="content" KBNumber="" />
                                        </div>
                                    </div>
                                    {author && <span className="text-xs font-bold">By {author}</span>}
                                </ShellLayout.Header>
                                <ShellLayout.Body>
                                    <RichTextEditor
                                        key={getArticleKey(article)}
                                        initialHtml={refinedArticleHtml}
                                        isEditable={isEditing}
                                        onEditableChange={setIsEditing}
                                        onSave={handleSaveEditedContent}
                                        actionsRef={editorActionsRef}
                                        extensions={{ textCase: false }}
                                        preserveInitialHtml={{ classes: true, head: true, styles: true }}
                                        className="my-0 w-full rounded-none border-none pl-2 pt-0 shadow-none"
                                        isSnowRelated
                                        snowSysId={currentSysId}
                                        snowTableName="kb_knowledge"
                                        onRequireSnowRecord={handleRequireSnowRecord}
                                    >
                                        <RichTextEditorToolbar />
                                        <RichTextEditorContent className={twMerge('min-h-20', isEditing ? 'max-h-[60dvh]' : 'max-h-[65dvh]')} />
                                    </RichTextEditor>
                                </ShellLayout.Body>
                            </ShellLayout>
                        ) : null
                    ) : null}

                    {/* Save (update to ITSM) step */}
                    {step === 'save-form' && refinedArticleHtml ? (
                        <div className="w-full bg-white px-6 py-5">
                            <GoBackButton onClick={() => setStep('refine')} title="Go back to refined article" />
                            {currentSysId && currentNumber ? (
                                <UpdateKBArticleForm
                                    articleNumber={currentNumber}
                                    articleText={refinedArticleHtml}
                                    shortDescription={title}
                                    defaultValues={{
                                        kb_category: createdDraftArticle?.kb_category || article.kb_category?.display_value || '',
                                        kb_knowledge_base: createdDraftArticle?.kb_knowledge_base || article.kb_knowledge_base?.display_value || '',
                                    }}
                                    onSubmitSuccess={async (data) => {
                                        setUpdatedArticle(data);
                                        setStep('success');
                                        queryClient.refetchQueries({ queryKey: ['knowledgeBrowserArticles'] });
                                    }}
                                />
                            ) : (
                                <CreateKBArticleForm
                                    shortDescription={title}
                                    articleText={refinedArticleHtml}
                                    defaultValues={{
                                        kb_category: article.kb_category?.display_value ?? '',
                                        kb_knowledge_base: article.kb_knowledge_base?.display_value ?? '',
                                    }}
                                    onSubmitSuccess={async (data) => {
                                        setUpdatedArticle(data);
                                        setStep('success');
                                        queryClient.refetchQueries({ queryKey: ['knowledgeBrowserArticles'] });
                                    }}
                                />
                            )}
                        </div>
                    ) : null}

                    {/* Success step */}
                    {step === 'success' && updatedArticle ? (
                        <div className="w-full bg-white px-6 py-8 flex flex-col items-center gap-4 text-sm">
                            <div className="flex items-center justify-center size-14 rounded-full bg-blue-100">
                                <CheckCircle size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-semibold text-blue-700">Success !</h3>
                            <div className="flex flex-col items-center gap-4 text-md font-bold text-(--brand-text-gray)">
                                <span>Article #{updatedArticle.number} saved successfully</span>
                                {updatedArticle.sys_id && (
                                    <a
                                        href={getServiceNowLink({ sysId: updatedArticle.sys_id, type: 'kb_knowledge' })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        View Article #{updatedArticle.number}
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : null}
                </Modal.Body>

                <Modal.Footer className="flex items-center justify-center p-2">
                    {showRefineActions ? (
                        isEditing ? (
                            <>
                                <Modal.ActionButton onClick={() => editorActionsRef.current?.discard()} variant="secondary" className="w-[50%] max-w-40">
                                    <Undo2 size={12} />
                                    Discard Changes
                                </Modal.ActionButton>
                                <Modal.ActionButton onClick={() => editorActionsRef.current?.save()} variant="primary" className="w-[50%] max-w-40">
                                    <Save size={12} />
                                    Update Changes
                                </Modal.ActionButton>
                            </>
                        ) : (
                            <>
                                <Modal.ActionButton onClick={() => setIsEditing(true)} variant="primary" className="w-[50%] max-w-40">
                                    <Pencil size={12} />
                                    Edit
                                </Modal.ActionButton>
                                <Modal.ActionButton
                                    onClick={() => {
                                        const html = editorActionsRef.current?.getHtml() ?? refinedArticleHtml ?? '';
                                        setRefinedArticleHtml(html);
                                        setStep('save-form');
                                    }}
                                    variant="primary"
                                    className="w-[50%] max-w-40"
                                >
                                    <Save size={12} />
                                    Save Article
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
                            </>
                        )
                    ) : null}

                    {step === 'success' ? (
                        <Modal.ActionButton variant="primary" onClick={onClose} className="max-w-40">
                            Close
                        </Modal.ActionButton>
                    ) : null}
                </Modal.Footer>
            </Modal>

            {/* Prompt User to Save Draft before Image Upload */}
            <SaveDraftPromptModal isOpen={isDraftPromptOpen} onClose={handleCancelDraftPrompt} onConfirm={handleConfirmDraftPrompt} />

            {/* Create Draft Article Form Modal */}
            <CreateDraftArticleModal
                isOpen={isCreateDraftModalOpen}
                onClose={handleCancelCreateDraftModal}
                onSubmitSuccess={handleDraftCreatedSuccess}
                shortDescription={title}
                articleText={editorActionsRef.current?.getHtml() || refinedArticleHtml || ''}
                defaultValues={{
                    kb_category: article?.kb_category?.display_value ?? '',
                    kb_knowledge_base: article?.kb_knowledge_base?.display_value ?? '',
                }}
            />
        </>
    );
};

export default KnowledgeArticleRefineModal;
