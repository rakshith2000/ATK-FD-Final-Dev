import { useMergeKnowledgeArticlesMutation } from '@/modules/knowledge-ai/hooks/useMergeKnowledgeArticlesMutation';
import type { DuplicateGroup, MergedKnowledgeArticleResponse } from '@/modules/knowledge-ai/types';
import Modal from '@/shared/components/ui/Modal/Modal';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle, ClipboardCopy, ExternalLink, LoaderCircle, Pencil, Save, Search, Undo2, X } from 'lucide-react';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import KBArticlesList from '../components/ui/KBArticlesList/KBArticlesList';
import { noop } from '@tanstack/react-table';
import type { RichTextEditorActions } from '@/shared/modules/rich-text-editor';
import RichTextEditor, { RichTextEditorContent, RichTextEditorToolbar } from '@/shared/modules/rich-text-editor';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { FaPencilAlt, FaSave, FaUndo } from 'react-icons/fa';
import { Tooltip } from '@mui/material';
import GoBackButton from '@/shared/components/ui/GoBackButton/GoBackButton';
import logger from '@/shared/utils/logger';
import { TextInput, MultiSelectInput } from '@/shared/components/ui/InputFields';
import { MergeArticleDetailsSection } from '../components/ui/MergeArticleDetailsSection/MergeArticleDetailsSection';
import { twMerge } from 'tailwind-merge';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { useCopyText } from '@/shared/hooks/useCopyText';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import type { CreateKnowledgeArticleResposne, UpdateKnowledgeArticleResposne } from '@/shared/modules/servicenow/types/knowledge';
import UpdateKBArticleForm from '@/shared/modules/servicenow/components/smart/UpdateKBArticelForm/UpdateKBArticelForm';
import CreateKBArticleForm from '@/shared/modules/servicenow/components/smart/CreateKBArticleForm/CreateKBArticleForm';
import SaveDraftPromptModal from '@/shared/modules/servicenow/components/smart/SaveDraftPromptModal';
import CreateDraftArticleModal from '@/shared/modules/servicenow/components/smart/CreateDraftArticleModal';
import { useDuplicateKnowledgeArticlesQuery } from '../hooks/useDuplicateKnowledgeArticlesQuery';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import KBArticleAIScore from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/KBArticleAIScore/KBArticleAIScore';

const DuplcateKBArticlesGroupList = React.lazy(() => import('../components/ui/DuplcateKBArticlesGroupList/DuplcateKBArticlesGroupList'));

interface MergedKnowledgeArticleMetadata {
    title: string;
    category: string;
    knowledgeBase: string;
    kb_number?: string;
    sys_id?: string;
    details: MergedKnowledgeArticleResponse['details'];
}

type ActiveTab = 'group-list' | 'selected-group' | 'merged-article' | 'update-article-form' | 'success';

const HEADER_TITLES: Record<ActiveTab, string> = {
    'group-list': 'Duplicate Articles',
    'selected-group': 'Selected articles to merge',
    'merged-article': 'Merged Article Details',
    'update-article-form': 'Save Merged Article',
    success: 'Article Saved',
};

const titleInputClassName = 'text-[0.9rem] font-semibold text-[var(--brand-text-color)] placeholder:text-gray-300';

const actionBtnBase =
    'flex-1 flex justify-center items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-all cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
const actionBtnBrand = `${actionBtnBase} text-white btn-split split-blue hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1`;
const actionBtnGhost = `${actionBtnBase} text-gray-500 border border-transparent bg-white hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1`;

const MergeDuplicateArticlesPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const query = useDuplicateKnowledgeArticlesQuery();

    const [activeTab, setActiveTab] = useState<ActiveTab>('group-list');
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
    const [mergedArticleHtml, setMergedArticleHtml] = useState<string | null>(null);
    const [mergedArticleMetadata, setMergedArticleMetadata] = useState<MergedKnowledgeArticleMetadata | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [updatedArticle, setUpdatedArticle] = useState<UpdateKnowledgeArticleResposne | null>(null);
    const { copied: htmlCopied, copy: copyHtml } = useCopyText(5000);

    // Group-list toolbar: search (by KB number / article title) + category multiselect filter
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const categoryOptions = useMemo(() => {
        const categories = (query.data?.byCategory ?? []).map((catalog) => catalog.category).filter(Boolean);
        return [...new Set(categories)].map((category) => ({ label: category, value: category }));
    }, [query.data]);

    const filteredByCategory = useMemo(() => {
        const term = groupSearchTerm.trim().toLowerCase();
        return (query.data?.byCategory ?? [])
            .filter((catalog) => selectedCategories.length === 0 || selectedCategories.includes(catalog.category))
            .map((catalog) => ({
                ...catalog,
                duplicateGroups: term
                    ? catalog.duplicateGroups.filter((group) =>
                          group.articles.some(
                              (article) => (article.kb_metadata?.number ?? '').toLowerCase().includes(term) || (article.kb_metadata?.title ?? '').toLowerCase().includes(term),
                          ),
                      )
                    : catalog.duplicateGroups,
            }))
            .filter((catalog) => catalog.duplicateGroups.length > 0);
    }, [query.data, groupSearchTerm, selectedCategories]);

    const hasActiveGroupFilters = groupSearchTerm.trim().length > 0 || selectedCategories.length > 0;

    const editorActionsRef = useRef<RichTextEditorActions>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const unsavedGuard = useConfirmUnsavedChanges();

    const mergeDuplicateKBArticlesMutaion = useMergeKnowledgeArticlesMutation();

    const isMergeDuplicateKBArticlesMutaionPending = mergeDuplicateKBArticlesMutaion.isPending;

    const canCloseFreely = ['group-list', 'success', 'selected-group'].includes(activeTab) && !isMergeDuplicateKBArticlesMutaionPending && !isEditing && !mergedArticleHtml;

    const canGoBackToListFreely = (!isMergeDuplicateKBArticlesMutaionPending && !isEditing && !mergedArticleHtml) || activeTab === 'success';

    const routeChangeBlocker = useBlocker({
        withResolver: true,
        enableBeforeUnload: false,
        shouldBlockFn: () => !canCloseFreely,
    });

    logger.debug({ canCloseFreely, canGoBackToListFreely });

    const handleSaveEditedContent = useCallback((html: string) => {
        setMergedArticleHtml(html);
        setIsEditing(false);
    }, []);

    const updateMergedKnowledgeArticleMetadata = (data: Partial<MergedKnowledgeArticleMetadata>) => {
        setMergedArticleMetadata((prev) => ({ ...prev, ...data }) as MergedKnowledgeArticleMetadata);
    };

    // States and handlers for image upload ServiceNow draft requirement
    const [isDraftPromptOpen, setIsDraftPromptOpen] = useState(false);
    const [isCreateDraftModalOpen, setIsCreateDraftModalOpen] = useState(false);
    const draftResolverRef = useRef<((sysId: string | null) => void) | null>(null);

    const handleRequireSnowRecord = useCallback((): Promise<string | null> => {
        if (mergedArticleMetadata?.sys_id) {
            return Promise.resolve(mergedArticleMetadata.sys_id);
        }
        return new Promise<string | null>((resolve) => {
            draftResolverRef.current = resolve;
            setIsDraftPromptOpen(true);
        });
    }, [mergedArticleMetadata?.sys_id]);

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
        updateMergedKnowledgeArticleMetadata({
            kb_number: data.number,
            sys_id: data.sys_id,
            ...(values?.kb_category ? { category: values.kb_category } : null),
            ...(values?.kb_knowledge_base ? { knowledgeBase: values.kb_knowledge_base } : null),
        });
        setIsCreateDraftModalOpen(false);
        draftResolverRef.current?.(data.sys_id);
        draftResolverRef.current = null;
    }, []);

    const handleMergeDuplicateArticles = async () => {
        if (!selectedGroup) return;

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const articles = selectedGroup.articles.reduce((acc: Record<string, string>, article, index) => {
            acc[`kb_article_${index + 1}`] = `${article?.kb_metadata?.number}`;

            return acc;
        }, {});

        const mergedArticle = await mergeDuplicateKBArticlesMutaion.mutateAsync({ articles, signal: controller.signal });

        setMergedArticleHtml(mergedArticle.merged_article);

        updateMergedKnowledgeArticleMetadata({
            title: mergedArticle.title,
            category: selectedGroup.category,
            knowledgeBase: selectedGroup.knowledgeBase,
            details: mergedArticle.details,
            kb_number: '',
            sys_id: '',
        });

        setActiveTab('merged-article');
    };

    const resetState = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        draftResolverRef.current?.(null);
        draftResolverRef.current = null;
        setIsDraftPromptOpen(false);
        setIsCreateDraftModalOpen(false);
        setActiveTab('group-list');
        setSelectedGroup(null);
        setIsEditing(false);
        setMergedArticleHtml(null);
        setMergedArticleMetadata(null);
        mergeDuplicateKBArticlesMutaion.reset();
    }, [mergeDuplicateKBArticlesMutaion]);

    const handleGroupSelect = (group: DuplicateGroup) => {
        setSelectedGroup(group);
        setActiveTab('selected-group');
    };

    const handleGoBackToList = async () => {
        if (await unsavedGuard.confirm(!canGoBackToListFreely)) {
            resetState();
        }
    };

    const navigateBack = useCallback(() => {
        navigate({ to: '/transition-ai/knowledge-ai' });
    }, [navigate]);

    const handleNavigateBack = async () => {
        if (await unsavedGuard.confirm(!canCloseFreely)) {
            resetState();
            navigateBack();
        }
    };

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
                    {activeTab === 'group-list' ? (
                        <div className="flex items-center gap-2">
                            <div className="relative w-full max-w-xs">
                                <Search size={13} className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-white" />
                                <input
                                    type="text"
                                    value={groupSearchTerm}
                                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                                    placeholder="Search by KB number or title..."
                                    className="w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-sm py-1.5 pl-8 pr-8 text-xs text-(--brand-text-inverse) placeholder:text-white/60 outline-none transition-colors focus:bg-white/20 focus:border-white/40"
                                />
                                {groupSearchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setGroupSearchTerm('')}
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
                    {activeTab !== 'group-list' ? <GoBackButton className="text-zinc-50 hover:text-zinc-100 mt-0.5" onClick={handleGoBackToList} title="Go back to List" /> : null}
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 text-xs text-gray-500 leading-relaxed custom-scrollbar">
                    {activeTab === 'group-list' ? (
                        <div className="flex flex-col">
                            <Suspense name="DuplcateKBArticlesGroupList-Suspense" fallback={<GridSkeleton cols={4} rows={4} className="p-2" />}>
                                <DuplcateKBArticlesGroupList
                                    categoryWiseDuplicateCatalog={filteredByCategory}
                                    error={query?.error}
                                    onSelect={handleGroupSelect}
                                    isError={query.isError}
                                    isLoading={query.isLoading}
                                    isRefetching={query?.isRefetching}
                                    onRefetch={query?.refetch}
                                    columns={3}
                                    noDataTitle={hasActiveGroupFilters ? 'No duplicate articles match your filters' : undefined}
                                />
                            </Suspense>
                        </div>
                    ) : null}

                    {activeTab === 'selected-group' && selectedGroup ? (
                        <KBArticlesList
                            articles={selectedGroup.articles}
                            kbCardConfig={{
                                showCreatedDate: false,
                                showRating: false,
                                renderWithMarkdown: true,
                                showContent: true,
                            }}
                            error={null}
                            onSelect={noop}
                            showArticleSearch={false}
                        />
                    ) : null}

                    {activeTab === 'merged-article' && mergedArticleHtml ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-5 py-2">
                            {/* Merged Article */}
                            <div className="col-span-1 lg:col-span-8 flex flex-col gap-1.5">
                                {mergedArticleMetadata ? (
                                    <section className="flex flex-col gap-1">
                                        {isEditing ? (
                                            <TextInput
                                                value={mergedArticleMetadata.title}
                                                onChange={(value) => updateMergedKnowledgeArticleMetadata({ title: typeof value === 'string' ? value : '' })}
                                                onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                                                placeholder="Article Title"
                                                className={titleInputClassName}
                                            />
                                        ) : (
                                            <h1 className="text-base 2xl:text-lg text-(--brand-text-color) font-semibold cursor-pointer" onClick={() => setIsEditing(true)}>
                                                {mergedArticleMetadata.title}
                                            </h1>
                                        )}
                                    </section>
                                ) : null}

                                <section className="flex flex-col gap-1">
                                    <div className="flex flex-row gap-2 justify-between items-center">
                                        <h1 className="text-sm 2xl:text-base text-(--brand-text-color) font-semibold">Comprehensive Merged Content</h1>
                                        <KBArticleAIScore className="max-w-max" KBContent={mergedArticleHtml} getScoreBy="content" KBNumber="" />
                                    </div>
                                    <ShellLayout className="shadow-xs rounded-md border-(--brand-border-color)">
                                        <ShellLayout.Body>
                                            <RichTextEditor
                                                initialHtml={mergedArticleHtml}
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
                                                className="relative border-none w-full shadow-none rounded-none my-0 pl-0 pt-0"
                                                isSnowRelated
                                                snowSysId={mergedArticleMetadata?.sys_id}
                                                snowTableName="kb_knowledge"
                                                onRequireSnowRecord={handleRequireSnowRecord}
                                            >
                                                <RichTextEditorToolbar />
                                                <RichTextEditorContent className={twMerge('min-h-20', isEditing ? 'max-h-[53dvh]' : 'max-h-[60dvh]')} />
                                                <div className="absolute bottom-0 right-0 p-4 flex-col gap-2 hidden">
                                                    <Tooltip title="Copy HTML" placement="top">
                                                        <button
                                                            className="shadow text-gray-500 bg-white w-10 h-10 flex justify-center items-center rounded-full text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 cursor-pointer"
                                                            onClick={() => {
                                                                const html = editorActionsRef.current?.copyHtml() ?? '';
                                                                if (html) copyHtml(html);
                                                            }}
                                                            disabled={htmlCopied}
                                                        >
                                                            {htmlCopied ? <Check size={12} className="text-green-600" /> : <ClipboardCopy size={12} />}
                                                            {htmlCopied ? 'Copied!' : 'Copy HTML'}
                                                        </button>
                                                    </Tooltip>

                                                    {!isEditing ? (
                                                        <Tooltip title="Edit merged content" placement="top">
                                                            <button
                                                                className="shadow text-gray-50 brand-btn-with-gradient-to-bottom w-10 h-10 flex justify-center items-center rounded-full text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 cursor-pointer"
                                                                onClick={() => setIsEditing(true)}
                                                            >
                                                                <FaPencilAlt />
                                                            </button>
                                                        </Tooltip>
                                                    ) : null}

                                                    {isEditing ? (
                                                        <>
                                                            <Tooltip title="Discard Changes" placement="top">
                                                                <button
                                                                    className="shadow text-gray-50 bg-red-400 hover:bg-red-500 w-10 h-10 flex justify-center items-center rounded-full text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 cursor-pointer"
                                                                    onClick={() => editorActionsRef.current?.discard()}
                                                                >
                                                                    <FaUndo />
                                                                </button>
                                                            </Tooltip>
                                                            <Tooltip title="Update Changes" placement="top">
                                                                <button
                                                                    className="shadow text-gray-50 bg-green-600 hover:bg-green-700 w-10 h-10 flex justify-center items-center rounded-full text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 cursor-pointer"
                                                                    onClick={() => editorActionsRef.current?.save()}
                                                                >
                                                                    <FaSave />
                                                                </button>
                                                            </Tooltip>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </RichTextEditor>
                                        </ShellLayout.Body>
                                    </ShellLayout>
                                </section>
                            </div>

                            {/* Merged Article Details */}
                            <div className="col-span-1 lg:col-span-4 flex flex-col gap-1.5">
                                <p>
                                    <TitleWithArraow title="Merge Analytics" className="p-0 text-sm" showArrow={false} />
                                </p>
                                <section className="flex flex-col max-h-[65dvh] overflow-x-auto gap-3">
                                    {Object.entries(mergedArticleMetadata?.details)?.map?.(([label, valueArray]) => {
                                        return (
                                            <MergeArticleDetailsSection key={label}>
                                                <MergeArticleDetailsSection.Title>{formatLabel(label)}</MergeArticleDetailsSection.Title>
                                                <MergeArticleDetailsSection.Body>
                                                    {Array.isArray(valueArray)
                                                        ? valueArray?.map?.((p) => <MergeArticleDetailsSection.BodyItem key={p}>{p}</MergeArticleDetailsSection.BodyItem>)
                                                        : null}
                                                </MergeArticleDetailsSection.Body>
                                            </MergeArticleDetailsSection>
                                        );
                                    })}
                                </section>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === 'update-article-form' && mergedArticleHtml && mergedArticleMetadata ? (
                        <div className="w-full bg-white px-6 py-5">
                            <GoBackButton onClick={() => setActiveTab('merged-article')} title="Go back to merged article details" />
                            {mergedArticleMetadata.sys_id && mergedArticleMetadata.kb_number ? (
                                <UpdateKBArticleForm
                                    articleNumber={mergedArticleMetadata.kb_number}
                                    shortDescription={mergedArticleMetadata?.title ?? ''}
                                    articleText={mergedArticleHtml ?? ''}
                                    onSubmitSuccess={async (data) => {
                                        setUpdatedArticle(data);
                                        setActiveTab('success');
                                        setMergedArticleHtml(null);
                                        setMergedArticleMetadata(null);
                                        queryClient.refetchQueries({
                                            queryKey: ['duplicateKnowledgeArticlesQuery'],
                                        });
                                    }}
                                    defaultValues={{
                                        kb_category: mergedArticleMetadata.category,
                                        kb_knowledge_base: mergedArticleMetadata.knowledgeBase,
                                    }}
                                />
                            ) : (
                                <CreateKBArticleForm
                                    shortDescription={mergedArticleMetadata?.title ?? ''}
                                    articleText={mergedArticleHtml ?? ''}
                                    onSubmitSuccess={async (data: CreateKnowledgeArticleResposne) => {
                                        setUpdatedArticle(data);
                                        setActiveTab('success');
                                        setMergedArticleHtml(null);
                                        setMergedArticleMetadata(null);
                                        queryClient.refetchQueries({
                                            queryKey: ['duplicateKnowledgeArticlesQuery'],
                                        });
                                    }}
                                    defaultValues={{
                                        kb_category: mergedArticleMetadata.category,
                                        kb_knowledge_base: mergedArticleMetadata.knowledgeBase,
                                    }}
                                />
                            )}
                        </div>
                    ) : null}

                    {activeTab === 'success' && updatedArticle && (
                        <div className="w-full bg-white px-6 py-8 flex flex-col items-center gap-4 border rounded-2xl text-sm">
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
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="flex-none flex gap-2 p-2 justify-center items-start">
                    {activeTab === 'group-list' ? (
                        <button onClick={handleNavigateBack} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                            <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">Back To Dashboard</span>
                        </button>
                    ) : null}

                    {activeTab === 'selected-group' ? (
                        <>
                            <button onClick={handleGoBackToList} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">Go back to List</span>
                            </button>
                            <button
                                onClick={handleMergeDuplicateArticles}
                                disabled={isMergeDuplicateKBArticlesMutaionPending}
                                className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}
                            >
                                <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                    {isMergeDuplicateKBArticlesMutaionPending && <LoaderCircle size={12} className="animate-spin" />}
                                    {isMergeDuplicateKBArticlesMutaionPending ? 'Merging...' : 'Merge Articles'}
                                </span>
                            </button>
                        </>
                    ) : null}

                    {activeTab === 'merged-article' ? (
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
                                            <Pencil size={14} />
                                            Edit
                                        </span>
                                    </button>
                                    <button onClick={() => setActiveTab('update-article-form')} className={twMerge(actionBtnBrand, 'w-[50%] max-w-40')}>
                                        <span className="flex flex-row flex-nowrap gap-2 justify-center items-center">
                                            <Save size={14} />
                                            Save Merged Article
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
                            {isMergeDuplicateKBArticlesMutaionPending ? 'Articles Merging In Progress' : isEditing ? 'Unsaved Changes' : 'Article Not Saved'}
                        </h2>
                    </div>
                    {isMergeDuplicateKBArticlesMutaionPending
                        ? 'Duplciate articles are being merged. This action will discard the result. Are you sure?'
                        : isEditing
                          ? 'You have unsaved changes in the editor. This action will discard those changes. Are you sure?'
                          : 'Merged KB article has not been saved yet. This action will discard it. Are you sure?'}
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
                shortDescription={mergedArticleMetadata?.title ?? ''}
                articleText={editorActionsRef.current?.getHtml() || mergedArticleHtml || ''}
                defaultValues={{
                    kb_category: mergedArticleMetadata?.category ?? '',
                    kb_knowledge_base: mergedArticleMetadata?.knowledgeBase ?? '',
                }}
            />
        </>
    );
};

export default MergeDuplicateArticlesPage;

const formatLabel = (key: string) => {
    return key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
