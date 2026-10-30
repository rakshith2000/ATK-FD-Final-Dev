import Modal, { type ModalProps } from '@/shared/components/ui/Modal/Modal';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { KBCatalogAnalytics, KnowledgeArticle_From_List_API } from '@/modules/knowledge-ai/types';
import React, { Suspense } from 'react';
import logger from '@/shared/utils/logger';
import { useCallback, useRef, useState, useTransition } from 'react';
import type { RichTextEditorActions } from '@/shared/modules/rich-text-editor';
import KBArticleCard from '../../ui/KBArticleCard/KBArticleCard';
import RichTextEditor, { RichTextEditorContent, RichTextEditorToolbar } from '@/shared/modules/rich-text-editor';
import { useRefineKbArticleMutation } from '@/modules/knowledge-ai/hooks/useRefineKbArticleMutation';
import { AlertTriangle, Check, CheckCircle, ClipboardCopy, ExternalLink, LoaderCircle, Pencil, Save, Undo2 } from 'lucide-react';
import GoBackButton from '@/shared/components/ui/GoBackButton/GoBackButton';
import UpdateKBArticleForm from '@/shared/modules/servicenow/components/smart/UpdateKBArticelForm/UpdateKBArticelForm';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import { useCopyText } from '@/shared/hooks/useCopyText';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import KBArticlesList from '../../ui/KBArticlesList/KBArticlesList';
import { twMerge } from 'tailwind-merge';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import type { UpdateKnowledgeArticleResposne } from '@/shared/modules/servicenow/types/knowledge';

interface RefineLowScoringArticleModalProps {
    isOpen: boolean;
    onClose: () => void;
    query: UseQueryResult<KBCatalogAnalytics, Error>;
}

type ActiveTab = 'list' | 'article' | 'refine-article' | 'update-form' | 'success';

const HEADER_TITLES: Record<ActiveTab, string> = {
    list: 'Low Scoring Articles',
    article: 'Article details and refinement',
    'refine-article': 'Article refinement complete',
    'update-form': 'Save KB Article',
    success: 'Article Updated',
};

const MODEL_SIZES: Record<ActiveTab, ModalProps['size']> = {
    list: 'full',
    article: '7xl',
    'refine-article': '7xl',
    'update-form': 'lg',
    success: 'md',
};

const RefineLowScoringArticleModal: React.FC<RefineLowScoringArticleModalProps> = ({ isOpen, onClose, query }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<ActiveTab>('list');
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle_From_List_API>();
    const [refinedArticleHtml, setRefinedArticleHtml] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [updatedArticle, setUpdatedArticle] = useState<UpdateKnowledgeArticleResposne | null>(null);
    const { copied: htmlCopied, copy: copyHtml } = useCopyText(5000);

    const editorActionsRef = useRef<RichTextEditorActions>(null);

    const [isSelectArticleForRefinementPending, startSelectArticleForRefinement] = useTransition();

    const unsavedGuard = useConfirmUnsavedChanges();

    const refineKbArticleMutation = useRefineKbArticleMutation();

    const isRefineKbArticleMutationPending = refineKbArticleMutation.isPending;

    const canCloseFreely = ['list', 'success', 'article'].includes(activeTab) && !isRefineKbArticleMutationPending && !isEditing && !refinedArticleHtml;

    const canGoBackToListFreely = (!isRefineKbArticleMutationPending && !isEditing && !refinedArticleHtml) || activeTab === 'success';

    const resetState = useCallback(() => {
        setRefinedArticleHtml(null);
        setUpdatedArticle(null);
        setIsEditing(false);
        setSelectedArticle(undefined);
        setActiveTab('list');
        refineKbArticleMutation.reset();
    }, []);

    const handleGoBackToList = useCallback(async () => {
        if (await unsavedGuard.confirm(!canGoBackToListFreely)) {
            resetState();
        }
    }, [canGoBackToListFreely, unsavedGuard, resetState]);

    const handleClose = useCallback(async () => {
        if (await unsavedGuard.confirm(!canCloseFreely)) {
            resetState();
            onClose();
        }
    }, [canCloseFreely, resetState, onClose, unsavedGuard]);

    const handleSelectArticle = (articleNumber: string) => {
        logger.debug('articleNumber', articleNumber);

        setActiveTab('article');

        startSelectArticleForRefinement(async () => {
            const matchedArticle = query?.data?.lowScoringArticles.find((article) => article?.number.value == articleNumber);
            setSelectedArticle(matchedArticle);
        });
    };

    const handleRefineArticle = useCallback(() => {
        if (!selectedArticle) {
            return;
        }

        refineKbArticleMutation.mutate(
            { kb_article: selectedArticle?.text.value },
            {
                onSuccess: (data) => {
                    setRefinedArticleHtml(data);
                    setActiveTab('refine-article');
                },
            },
        );
    }, [selectedArticle]);

    const handleSaveEditedContent = useCallback((html: string) => {
        setRefinedArticleHtml(html);
        setIsEditing(false);
    }, []);

    return (
        <>
            <Modal size={MODEL_SIZES[activeTab]} className="p-0" open={isOpen} onClose={handleClose} closeOnEscapeKeyDown={canCloseFreely} closeOnOutsideClick={canCloseFreely}>
                <Modal.Header className="p-2 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                    {HEADER_TITLES[activeTab]}
                </Modal.Header>
                <Modal.Body className="px-0 py-2 m-0">
                    {activeTab === 'list' ? (
                        <Suspense name="KBArticlesList-Suspense" fallback={<GridSkeleton cols={2} rows={2} className="p-4" />}>
                            <KBArticlesList
                                articles={
                                    query?.data?.lowScoringArticles?.map((article) => {
                                        return {
                                            content: article.text.value,
                                            kb_metadata: {
                                                author: article.author.display_value,
                                                kb_category: article.kb_category.display_value,
                                                kb_knowledge_base: article.kb_knowledge_base.display_value,
                                                kb_link: '',
                                                number: article.number.value,
                                                rating: article.rating.value,
                                                roles: [],
                                                title: article.short_description.value,
                                            },
                                        };
                                    }) ?? []
                                }
                                onSelect={handleSelectArticle}
                                error={query?.error}
                                isError={query?.isError}
                                isLoading={query?.isLoading}
                                isRefetching={query?.isRefetching}
                                onRefetch={query?.refetch}
                                kbCardConfig={{
                                    showContent: false,
                                    showRating: true,
                                    showAIRating: false,
                                }}
                            />
                        </Suspense>
                    ) : null}

                    {activeTab === 'article' ? (
                        <div className="flex flex-col p-1 gap-1">
                            <KBArticleCard
                                renderWithRichtextEditor
                                error={null}
                                isLoading={isSelectArticleForRefinementPending}
                                article={{
                                    content: selectedArticle?.text.value ?? '',
                                    kb_metadata: {
                                        author: selectedArticle?.author.display_value ?? '',
                                        kb_category: selectedArticle?.kb_category.display_value ?? '',
                                        kb_knowledge_base: selectedArticle?.kb_knowledge_base.display_value ?? '',
                                        kb_link: '',
                                        number: selectedArticle?.number.value ?? '',
                                        rating: selectedArticle?.rating.value ?? '',
                                        roles: [],
                                        title: selectedArticle?.short_description.value ?? '',
                                    },
                                }}
                            />
                        </div>
                    ) : null}

                    {selectedArticle && activeTab !== 'article' && activeTab !== 'list' && activeTab !== 'success' ? (
                        <ShellLayout className="shadow-none border-none">
                            <ShellLayout.Header className="flex flex-col gap-0 px-4 pb-0">
                                <>
                                    <div className="w-full gap-0.5 flex justify-between items-start flex-1">
                                        <h1 className="text-sm font-bold text-(--brand-title-primary-color)">
                                            {selectedArticle?.number.value} : {selectedArticle?.short_description.value}
                                        </h1>
                                    </div>
                                    <span className="text-xs font-bold">By {selectedArticle?.author.display_value}</span>
                                </>
                            </ShellLayout.Header>
                            <ShellLayout.Body>
                                {activeTab === 'refine-article' && refinedArticleHtml ? (
                                    <RichTextEditor
                                        initialHtml={refinedArticleHtml}
                                        isEditable={isEditing}
                                        onEditableChange={setIsEditing}
                                        onSave={handleSaveEditedContent}
                                        actionsRef={editorActionsRef}
                                        extensions={{
                                            textCase: false,
                                        }}
                                        preserveInitialHtml={{
                                            classes: true,
                                            head: true,
                                            styles: true,
                                        }}
                                        className="border-none w-full shadow-none rounded-none my-0 pl-2 pt-0"
                                        isSnowRelated
                                        snowSysId={selectedArticle.sys_id.value}
                                        snowTableName="kb_knowledge"
                                    >
                                        <RichTextEditorToolbar />
                                        <RichTextEditorContent className={twMerge('min-h-20', isEditing ? 'max-h-[60dvh]' : 'max-h-[65dvh]')} />
                                    </RichTextEditor>
                                ) : null}

                                {activeTab === 'update-form' ? (
                                    <div className="w-full bg-white px-6 py-5">
                                        <GoBackButton onClick={() => setActiveTab('refine-article')} title="Go back to editor" />
                                        <UpdateKBArticleForm
                                            articleNumber={selectedArticle?.number.value}
                                            articleText={editorActionsRef?.current?.getHtml() ?? refinedArticleHtml ?? ''}
                                            defaultValues={{
                                                kb_category: selectedArticle.kb_category.display_value,
                                                kb_knowledge_base: selectedArticle.kb_knowledge_base.display_value,
                                            }}
                                            onSubmitSuccess={async (data) => {
                                                setUpdatedArticle(data);
                                                setActiveTab('success');
                                                setRefinedArticleHtml(null);
                                                queryClient.refetchQueries({
                                                    queryKey: ['knowledgeArticles'],
                                                });
                                            }}
                                            shortDescription={selectedArticle?.short_description.value}
                                        />
                                    </div>
                                ) : null}
                            </ShellLayout.Body>
                        </ShellLayout>
                    ) : null}

                    {/* Success */}
                    {activeTab === 'success' && updatedArticle && (
                        <div className="w-full bg-white px-6 py-8 flex flex-col items-center gap-4 text-sm">
                            <div className="flex items-center justify-center size-14 rounded-full bg-blue-100">
                                <CheckCircle size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-semibold text-blue-700">Success !</h3>
                            <div className="flex flex-col items-center gap-4 text-md font-bold text-(--brand-text-gray)">
                                <span>Article #{updatedArticle.number} updated Sucessfully</span>
                                {updatedArticle.sys_id && (
                                    <a
                                        href={getServiceNowLink({ sysId: updatedArticle?.sys_id, type: 'kb_knowledge' })}
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
                    )}
                </Modal.Body>
                <Modal.Footer className="p-2 flex justify-center items-start">
                    {activeTab === 'list' ? (
                        <Modal.ActionButton variant="brand" onClick={handleClose} className="w-[50%] max-w-40">
                            Close
                        </Modal.ActionButton>
                    ) : null}
                    {activeTab === 'article' ? (
                        <>
                            <Modal.ActionButton variant="secondary" onClick={handleGoBackToList} className="w-[50%] max-w-40">
                                Go back to List
                            </Modal.ActionButton>
                            <Modal.ActionButton variant="brand" onClick={handleRefineArticle} disabled={isRefineKbArticleMutationPending} className="w-[50%] max-w-40">
                                {isRefineKbArticleMutationPending && <LoaderCircle size={12} className="animate-spin" />}
                                {isRefineKbArticleMutationPending ? 'Refining...' : 'Refine Article'}
                            </Modal.ActionButton>
                        </>
                    ) : null}
                    {activeTab === 'refine-article' ? (
                        <>
                            {isEditing ? (
                                <>
                                    <Modal.ActionButton onClick={() => editorActionsRef.current?.discard()} variant="secondary" className="w-[50%] max-w-40">
                                        <Undo2 size={12} />
                                        Discard Changes
                                    </Modal.ActionButton>
                                    <Modal.ActionButton onClick={() => editorActionsRef.current?.save()} variant="brand" className="w-[50%] max-w-40">
                                        <Save size={12} />
                                        Update Changes
                                    </Modal.ActionButton>
                                </>
                            ) : (
                                <>
                                    <Modal.ActionButton onClick={() => setIsEditing(true)} variant="brand" className="w-[50%] max-w-40">
                                        <Pencil size={12} />
                                        Edit
                                    </Modal.ActionButton>
                                    <Modal.ActionButton onClick={() => setActiveTab('update-form')} variant="brand" className="w-[50%] max-w-40">
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
                            )}
                        </>
                    ) : null}

                    {activeTab === 'success' ? (
                        <>
                            <Modal.ActionButton variant="secondary" onClick={handleGoBackToList} className="w-[50%] max-w-40">
                                Go back to List
                            </Modal.ActionButton>
                            <Modal.ActionButton onClick={handleClose} variant="brand" className="max-w-40">
                                Close
                            </Modal.ActionButton>
                        </>
                    ) : null}
                </Modal.Footer>
            </Modal>

            {/* Warning */}
            <Modal size="xs" open={unsavedGuard.isOpen} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} className="p-4">
                <Modal.Body className="text-center">
                    <div className="flex flex-col items-center text-center pt-2">
                        <div className="flex items-center justify-center size-11 rounded-full bg-red-50">
                            <AlertTriangle size={22} className="text-red-400" />
                        </div>
                        <h2 className="text-sm font-medium text-gray-800">
                            {isRefineKbArticleMutationPending ? 'Article Refinement In Progress' : isEditing ? 'Unsaved Changes' : 'Article Not Saved'}
                        </h2>
                    </div>
                    {isRefineKbArticleMutationPending
                        ? 'KB article is still being refined. This action will discard the result. Are you sure?'
                        : isEditing
                          ? 'You have unsaved changes in the editor. This action will discard those changes. Are you sure?'
                          : 'Refined KB article has not been saved yet. This action will discard it. Are you sure?'}
                </Modal.Body>

                <Modal.Footer className="flex-row">
                    <Modal.ActionButton variant="danger" onClick={unsavedGuard.proceed}>
                        Discard & Proceed
                    </Modal.ActionButton>
                    <Modal.ActionButton variant="brand" onClick={unsavedGuard.cancel}>
                        Stay
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default RefineLowScoringArticleModal;
