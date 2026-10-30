import Modal from '@/shared/components/ui/Modal/Modal';
import { useQueryClient } from '@tanstack/react-query';
import type { KnowledgeArticle_From_List_API } from '@/modules/knowledge-ai/types';
import React, { Suspense, useEffect } from 'react';
import logger from '@/shared/utils/logger';
import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import type { RichTextEditorActions } from '@/shared/modules/rich-text-editor';
import KBArticleCard from '../components/ui/KBArticleCard/KBArticleCard';
import RichTextEditor, { RichTextEditorContent, RichTextEditorToolbar } from '@/shared/modules/rich-text-editor';
import { useRefineKbArticleMutation } from '@/modules/knowledge-ai/hooks/useRefineKbArticleMutation';
import { AlertTriangle, Check, CheckCircle, ClipboardCopy, ExternalLink, LoaderCircle, Pencil, Save, Search, Undo2, X } from 'lucide-react';
import GoBackButton from '@/shared/components/ui/GoBackButton/GoBackButton';
import UpdateKBArticleForm from '@/shared/modules/servicenow/components/smart/UpdateKBArticelForm/UpdateKBArticelForm';
import CreateKBArticleForm from '@/shared/modules/servicenow/components/smart/CreateKBArticleForm/CreateKBArticleForm';
import SaveDraftPromptModal from '@/shared/modules/servicenow/components/smart/SaveDraftPromptModal';
import CreateDraftArticleModal from '@/shared/modules/servicenow/components/smart/CreateDraftArticleModal';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import { useCopyText } from '@/shared/hooks/useCopyText';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import KBArticlesList from '../components/ui/KBArticlesList/KBArticlesList';
import { MultiSelectInput } from '@/shared/components/ui/InputFields';
import { twMerge } from 'tailwind-merge';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import type { CreateKnowledgeArticleResposne, UpdateKnowledgeArticleResposne } from '@/shared/modules/servicenow/types/knowledge';
import { useKnowledgeArticlesQuery } from '../hooks/useKnowledgeArticlesQuery';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import KBArticleAIScore from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/KBArticleAIScore/KBArticleAIScore';

type ActiveTab = 'list' | 'article' | 'refine-article' | 'update-form' | 'success';

const HEADER_TITLES: Record<ActiveTab, string> = {
    list: 'Low Scoring Articles',
    article: 'Article details and refinement',
    'refine-article': 'Article refinement complete',
    'update-form': 'Save KB Article',
    success: 'Article Updated',
};

const actionBtnBase =
    'flex-1 flex justify-center items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-all cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
const actionBtnBrand = `${actionBtnBase} text-white btn-split split-blue hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1`;
const actionBtnGhost = `${actionBtnBase} text-gray-500 border border-transparent bg-white hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1`;

const RefineArticlesPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const query = useKnowledgeArticlesQuery();

    const [activeTab, setActiveTab] = useState<ActiveTab>('list');
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle_From_List_API>();
    const [refinedArticleHtml, setRefinedArticleHtml] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [updatedArticle, setUpdatedArticle] = useState<UpdateKnowledgeArticleResposne | CreateKnowledgeArticleResposne | null>(null);
    const { copied: htmlCopied, copy: copyHtml } = useCopyText(5000);

    // States and handlers for image upload ServiceNow draft requirement
    const [createdDraftArticle, setCreatedDraftArticle] = useState<{
        sys_id: string;
        number: string;
        kb_knowledge_base?: string;
        kb_category?: string;
    } | null>(null);
    const currentSysId = createdDraftArticle?.sys_id || selectedArticle?.sys_id?.value || '';
    const currentNumber = createdDraftArticle?.number || selectedArticle?.number?.value || '';

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

    // Header search + category filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const mappedArticles = useMemo(
        () =>
            query?.data?.lowScoringArticles?.map((article) => ({
                content: article.text.value,
                kb_metadata: {
                    author: article.author.display_value,
                    kb_category: article.kb_category.display_value,
                    kb_knowledge_base: article.kb_knowledge_base.display_value,
                    kb_link: '',
                    number: article.number.value,
                    rating: article.rating.value,
                    roles: [] as string[],
                    title: article.short_description.value,
                    ai_score: article?.ai_score,
                },
            })) ?? [],
        [query?.data?.lowScoringArticles],
    );

    const categoryOptions = useMemo(() => {
        const categories = mappedArticles.map((a) => a.kb_metadata.kb_category).filter(Boolean);
        return [...new Set(categories)].map((c) => ({ label: c, value: c }));
    }, [mappedArticles]);

    const filteredArticles = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return mappedArticles.filter((article) => {
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(article.kb_metadata.kb_category);
            const matchesSearch = !term || article.kb_metadata.title.toLowerCase().includes(term) || article.kb_metadata.number.toLowerCase().includes(term);
            return matchesCategory && matchesSearch;
        });
    }, [mappedArticles, searchTerm, selectedCategories]);

    const editorActionsRef = useRef<RichTextEditorActions>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [isSelectArticleForRefinementPending, startSelectArticleForRefinement] = useTransition();

    const unsavedGuard = useConfirmUnsavedChanges();

    const refineKbArticleMutation = useRefineKbArticleMutation();

    const isRefineKbArticleMutationPending = refineKbArticleMutation.isPending;

    const canCloseFreely = ['list', 'success', 'article'].includes(activeTab) && !isRefineKbArticleMutationPending && !isEditing && !refinedArticleHtml;

    const canGoBackToListFreely = (!isRefineKbArticleMutationPending && !isEditing && !refinedArticleHtml) || activeTab === 'success';

    const routeChangeBlocker = useBlocker({
        withResolver: true,
        enableBeforeUnload: false,
        shouldBlockFn: () => !canCloseFreely,
    });

    const resetState = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        draftResolverRef.current?.(null);
        draftResolverRef.current = null;
        setIsDraftPromptOpen(false);
        setIsCreateDraftModalOpen(false);
        setCreatedDraftArticle(null);
        setRefinedArticleHtml(null);
        setUpdatedArticle(null);
        setIsEditing(false);
        setSelectedArticle(undefined);
        setActiveTab('list');
        refineKbArticleMutation.reset();
    }, [refineKbArticleMutation]);

    const handleGoBackToList = useCallback(async () => {
        if (await unsavedGuard.confirm(!canGoBackToListFreely)) {
            resetState();
        }
    }, [canGoBackToListFreely, unsavedGuard, resetState]);

    const navigateBack = useCallback(() => {
        navigate({ to: '/transition-ai/knowledge-ai' });
    }, [navigate]);

    const handleNavigateBack = useCallback(async () => {
        if (await unsavedGuard.confirm(!canCloseFreely)) {
            resetState();
            navigateBack();
        }
    }, [canCloseFreely, resetState, navigateBack, unsavedGuard]);

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

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        refineKbArticleMutation.mutate(
            { kb_article: selectedArticle?.number?.value, signal: controller.signal },
            {
                onSuccess: (data) => {
                    setRefinedArticleHtml(data);
                    setActiveTab('refine-article');
                },
            },
        );
    }, [selectedArticle, refineKbArticleMutation]);

    const handleSaveEditedContent = useCallback((html: string) => {
        setRefinedArticleHtml(html);
        setIsEditing(false);
    }, []);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort?.();
            draftResolverRef.current?.(null);
        };
    }, []);

    return (
        <>
            <div className="flex h-full w-full flex-col overflow-hidden">
                {/* Header */}
                <div className="flex-none flex flex-col lg:flex-row items-center justify-between gap-2 p-2 brand-bg-with-gradient-1 font-semibold text-sm 2xl:text-base">
                    <span className="shrink-0">{HEADER_TITLES[activeTab]}</span>
                    {activeTab === 'list' ? (
                        <div className="flex items-center gap-2">
                            <div className="relative w-full max-w-xs">
                                <Search size={13} className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-white" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by KB number or title..."
                                    className="w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-sm py-1.5 pl-8 pr-8 text-xs text-(--brand-text-inverse) placeholder:text-white/60 outline-none transition-colors focus:bg-white/20 focus:border-white/40"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        aria-label="Clear search"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-white/60 transition-colors hover:text-white"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            <div className="w-60 shrink-0">
                                <MultiSelectInput
                                    value={selectedCategories}
                                    onChange={setSelectedCategories}
                                    options={categoryOptions}
                                    placeholder="Filter by category"
                                    maxChips={1}
                                    triggerClassName="border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60 hover:border-white/40 focus:border-white/40 focus:ring-white/20"
                                    chipClassName="bg-white/20 text-white border-white/30"
                                />
                            </div>
                        </div>
                    ) : null}
                    {activeTab !== 'list' ? <GoBackButton className="text-zinc-50 hover:text-zinc-100 mt-0.5" onClick={handleGoBackToList} title="Go back to List" /> : null}
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 text-xs text-gray-500 leading-relaxed custom-scrollbar">
                    {activeTab === 'list' ? (
                        <Suspense name="KBArticlesList-Suspense" fallback={<GridSkeleton cols={2} rows={2} className="p-4" />}>
                            <KBArticlesList
                                articles={filteredArticles}
                                onSelect={handleSelectArticle}
                                error={query?.error}
                                isError={query?.isError}
                                isLoading={query?.isLoading}
                                isRefetching={query?.isRefetching}
                                onRefetch={query?.refetch}
                                showArticleSearch={false}
                                kbCardConfig={{
                                    showContent: false,
                                    showRating: true,
                                    showAIRating: true,
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
                                <div className="flex flex-row gap-2 justify-between items-center">
                                    <div className="">
                                        <div className="w-full gap-0.5 flex justify-between items-start flex-1">
                                            <h1 className="text-sm font-bold text-(--brand-title-primary-color)">
                                                {selectedArticle?.number.value} : {selectedArticle?.short_description.value}
                                            </h1>
                                        </div>
                                        <span className="text-xs font-bold">By {selectedArticle?.author.display_value}</span>
                                    </div>
                                    <div className="flex flex-row gap-2 justify-between items-center">
                                        <KBArticleAIScore className="max-w-max" KBContent={refinedArticleHtml ?? ''} getScoreBy="content" KBNumber="" />
                                    </div>
                                </div>
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
                                        snowSysId={currentSysId}
                                        snowTableName="kb_knowledge"
                                        onRequireSnowRecord={handleRequireSnowRecord}
                                    >
                                        <RichTextEditorToolbar />
                                        <RichTextEditorContent className={twMerge('min-h-20', isEditing ? 'max-h-[60dvh]' : 'max-h-[65dvh]')} />
                                    </RichTextEditor>
                                ) : null}

                                {activeTab === 'update-form' ? (
                                    <div className="w-full bg-white px-6 py-5">
                                        <GoBackButton onClick={() => setActiveTab('refine-article')} title="Go back to editor" />
                                        {currentSysId && currentNumber ? (
                                            <UpdateKBArticleForm
                                                articleNumber={currentNumber}
                                                articleText={editorActionsRef?.current?.getHtml() ?? refinedArticleHtml ?? ''}
                                                defaultValues={{
                                                    kb_category: createdDraftArticle?.kb_category || selectedArticle?.kb_category?.display_value || '',
                                                    kb_knowledge_base: createdDraftArticle?.kb_knowledge_base || selectedArticle?.kb_knowledge_base?.display_value || '',
                                                }}
                                                onSubmitSuccess={async (data) => {
                                                    setUpdatedArticle(data);
                                                    setActiveTab('success');
                                                    setRefinedArticleHtml(null);
                                                    queryClient.refetchQueries({
                                                        queryKey: ['knowledgeArticles'],
                                                    });
                                                }}
                                                shortDescription={selectedArticle?.short_description?.value ?? ''}
                                            />
                                        ) : (
                                            <CreateKBArticleForm
                                                shortDescription={selectedArticle?.short_description?.value ?? ''}
                                                articleText={editorActionsRef?.current?.getHtml() ?? refinedArticleHtml ?? ''}
                                                defaultValues={{
                                                    kb_category: selectedArticle?.kb_category?.display_value ?? '',
                                                    kb_knowledge_base: selectedArticle?.kb_knowledge_base?.display_value ?? '',
                                                }}
                                                onSubmitSuccess={async (data) => {
                                                    setUpdatedArticle(data);
                                                    setActiveTab('success');
                                                    setRefinedArticleHtml(null);
                                                    queryClient.refetchQueries({
                                                        queryKey: ['knowledgeArticles'],
                                                    });
                                                }}
                                            />
                                        )}
                                    </div>
                                ) : null}
                            </ShellLayout.Body>
                        </ShellLayout>
                    ) : null}

                    {/* Success */}
                    {activeTab === 'success' && updatedArticle && (
                        <div className="w-full bg-white px-6 py-8 flex flex-col items-center gap-4 text-sm border rounded-2xl">
                            <div className="flex items-center justify-center size-14 rounded-full bg-blue-100">
                                <CheckCircle size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-semibold text-blue-700">Success !</h3>
                            <div className="flex flex-col items-center gap-4 text-md font-bold text-(--brand-text-gray)">
                                <span>Article #{updatedArticle.number} saved successfully</span>
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
                </div>

                {/* Footer / Actions */}
                <div className="flex-none flex gap-2 p-2 justify-center items-start">
                    {activeTab === 'list' ? (
                        <button onClick={handleNavigateBack} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                            <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">Back To Dashboard</span>
                        </button>
                    ) : null}

                    {activeTab === 'article' ? (
                        <>
                            <button onClick={handleGoBackToList} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">Go back to List</span>
                            </button>
                            <button onClick={handleRefineArticle} disabled={isRefineKbArticleMutationPending} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                    {isRefineKbArticleMutationPending && <LoaderCircle size={12} className="animate-spin" />}
                                    {isRefineKbArticleMutationPending ? 'Refining...' : 'Refine Article'}
                                </span>
                            </button>
                        </>
                    ) : null}

                    {activeTab === 'refine-article' ? (
                        <>
                            {isEditing ? (
                                <>
                                    <button onClick={() => editorActionsRef.current?.discard()} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                            <Undo2 size={12} />
                                            Discard Changes
                                        </span>
                                    </button>
                                    <button onClick={() => editorActionsRef.current?.save()} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                            <Save size={12} />
                                            Update Changes
                                        </span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(true)} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                            <Pencil size={12} />
                                            Edit
                                        </span>
                                    </button>
                                    <button onClick={() => setActiveTab('update-form')} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                            <Save size={12} />
                                            Save Article
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const html = editorActionsRef.current?.copyHtml() ?? '';
                                            if (html) copyHtml(html);
                                        }}
                                        className={twMerge(actionBtnGhost, 'w-[50%] max-w-40')}
                                        disabled={htmlCopied}
                                    >
                                        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                            {htmlCopied ? <Check size={12} className="text-green-600" /> : <ClipboardCopy size={12} />}
                                            {htmlCopied ? 'Copied!' : 'Copy HTML'}
                                        </span>
                                    </button>
                                </>
                            )}
                        </>
                    ) : null}

                    {activeTab === 'success' ? (
                        <>
                            <button onClick={handleGoBackToList} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">Go back to List</span>
                            </button>
                            <button onClick={handleNavigateBack} className={twMerge(actionBtnBrand, 'max-w-40')}>
                                <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">Back to Dashboard</span>
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* Warning */}
            <Modal size="xs" open={unsavedGuard.isOpen || routeChangeBlocker.status === 'blocked'} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} className="p-4">
                <Modal.Body className="text-center">
                    <div className="flex gap-4 flex-col items-center text-center pt-2">
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
                    <Modal.ActionButton
                        variant="danger"
                        onClick={() => {
                            if (routeChangeBlocker.status === 'blocked') {
                                routeChangeBlocker.proceed();
                            }
                            unsavedGuard.proceed();
                        }}
                    >
                        Discard & Proceed
                    </Modal.ActionButton>
                    <Modal.ActionButton
                        variant="brand"
                        onClick={() => {
                            if (routeChangeBlocker.status === 'blocked') {
                                routeChangeBlocker.reset();
                            }
                            unsavedGuard.cancel();
                        }}
                    >
                        Stay
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* Prompt User to Save Draft before Image Upload */}
            <SaveDraftPromptModal isOpen={isDraftPromptOpen} onClose={handleCancelDraftPrompt} onConfirm={handleConfirmDraftPrompt} />

            {/* Create Draft Article Form Modal */}
            <CreateDraftArticleModal
                isOpen={isCreateDraftModalOpen}
                onClose={handleCancelCreateDraftModal}
                onSubmitSuccess={handleDraftCreatedSuccess}
                shortDescription={selectedArticle?.short_description?.value ?? ''}
                articleText={editorActionsRef.current?.getHtml() || refinedArticleHtml || ''}
                defaultValues={{
                    kb_category: selectedArticle?.kb_category?.display_value ?? '',
                    kb_knowledge_base: selectedArticle?.kb_knowledge_base?.display_value ?? '',
                }}
            />
        </>
    );
};

export default RefineArticlesPage;
