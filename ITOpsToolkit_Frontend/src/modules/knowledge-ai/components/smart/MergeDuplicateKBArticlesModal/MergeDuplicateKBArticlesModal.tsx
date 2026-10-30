import { useMergeKnowledgeArticlesMutation } from '@/modules/knowledge-ai/hooks/useMergeKnowledgeArticlesMutation';
import type { DuplicateGroup, DuplicateKBCatalogAnalytics, MergedKnowledgeArticleResponse } from '@/modules/knowledge-ai/types';
import type { ModalProps } from '@/shared/components/ui/Modal/Modal';
import Modal from '@/shared/components/ui/Modal/Modal';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle, ClipboardCopy, ExternalLink, LoaderCircle, Pencil, Save, Search, Undo2, X } from 'lucide-react';
import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import KBArticlesList from '../../ui/KBArticlesList/KBArticlesList';
import { noop } from '@tanstack/react-table';
import type { RichTextEditorActions } from '@/shared/modules/rich-text-editor';
import RichTextEditor, { RichTextEditorContent, RichTextEditorToolbar } from '@/shared/modules/rich-text-editor';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { FaPencilAlt, FaSave, FaUndo } from 'react-icons/fa';
import { Tooltip } from '@mui/material';
import GoBackButton from '@/shared/components/ui/GoBackButton/GoBackButton';
import logger from '@/shared/utils/logger';
import { TextInput, MultiSelectInput } from '@/shared/components/ui/InputFields';
import { MergeArticleDetailsSection } from '../../ui/MergeArticleDetailsSection/MergeArticleDetailsSection';
import { twMerge } from 'tailwind-merge';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { useCopyText } from '@/shared/hooks/useCopyText';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import type { UpdateKnowledgeArticleResposne } from '@/shared/modules/servicenow/types/knowledge';
import { useCreateKnowledgeArticleMutation } from '@/shared/modules/servicenow/hooks/useCreateKnowledgeArticleMutation';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import UpdateKBArticleForm from '@/shared/modules/servicenow/components/smart/UpdateKBArticelForm/UpdateKBArticelForm';

const DuplcateKBArticlesGroupList = React.lazy(() => import('../../ui/DuplcateKBArticlesGroupList/DuplcateKBArticlesGroupList'));

interface MergeDuplicateKBArticlesModalProps {
    isOpen: boolean;
    onClose: () => void;
    query: UseQueryResult<DuplicateKBCatalogAnalytics, Error>;
}

interface MergedKnowledgeArticleMetadata {
    title: string;
    category: string;
    knowledgeBase: string;
    kb_number: string;
    sys_id: string;
    details: MergedKnowledgeArticleResponse['details'];
}

type ActiveTab = 'group-list' | 'selected-group' | 'merged-article' | 'update-article-form' | 'success';

const HEADER_TITLES: Record<ActiveTab, string> = {
    'group-list': 'Categories With Duplicate Articles',
    'selected-group': 'Duplicate Articles',
    'merged-article': 'Merged Article Details',
    'update-article-form': 'Save Merged Article',
    success: 'Article Updated',
};

const MODAL_SIZES: Record<ActiveTab, ModalProps['size']> = {
    'group-list': 'full',
    'selected-group': '7xl',
    'merged-article': '7xl',
    'update-article-form': 'lg',
    success: 'md',
};

const titleInputClassName = 'text-[0.9rem] font-semibold text-[var(--brand-text-color)] placeholder:text-gray-300';

const MergeDuplicateKBArticlesModal: React.FC<MergeDuplicateKBArticlesModalProps> = ({ isOpen, onClose, query }) => {
    const { getUserSnowDetails } = useAuth();
    const queryClient = useQueryClient();
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

    const unsavedGuard = useConfirmUnsavedChanges();

    const mergeDuplicateKBArticlesMutaion = useMergeKnowledgeArticlesMutation();

    const createKnowledgeArticleMutation = useCreateKnowledgeArticleMutation();

    const isMergeDuplicateKBArticlesMutaionPending = mergeDuplicateKBArticlesMutaion.isPending || createKnowledgeArticleMutation.isPending;

    const canCloseFreely = ['group-list', 'success', 'selected-group'].includes(activeTab) && !isMergeDuplicateKBArticlesMutaionPending && !isEditing && !mergedArticleHtml;

    const canGoBackToListFreely = (!isMergeDuplicateKBArticlesMutaionPending && !isEditing && !mergedArticleHtml) || activeTab === 'success';

    logger.debug({ canCloseFreely, canGoBackToListFreely });
    const handleSaveEditedContent = useCallback((html: string) => {
        setMergedArticleHtml(html);
        setIsEditing(false);
    }, []);

    const updateMergedKnowledgeArticleMetadata = (data: Partial<MergedKnowledgeArticleMetadata>) => {
        setMergedArticleMetadata((prev) => ({ ...prev, ...data }) as MergedKnowledgeArticleMetadata);
    };

    const handleMergeDuplicateArticles = async () => {
        if (!selectedGroup) return;

        const articles = selectedGroup.articles.reduce((acc: Record<string, string>, article, index) => {
            acc[`kb_article_${index + 1}`] = `kb_number:${article?.kb_metadata?.number} \n\n ${article.content}`;

            return acc;
        }, {});

        const mergedArticle = await mergeDuplicateKBArticlesMutaion.mutateAsync({ articles });

        const userSnowDetails = await getUserSnowDetails();

        const createdArticle = await createKnowledgeArticleMutation.mutateAsync({
            author: userSnowDetails.sys_id,
            kb_knowledge_base: selectedGroup.knowledgeBase,
            kb_category: selectedGroup.category,
            short_description: mergedArticle.title,
            text: mergedArticle.merged_article,
            workflow_state: 'draft',
        });

        setMergedArticleHtml(mergedArticle.merged_article);

        updateMergedKnowledgeArticleMetadata({
            title: mergedArticle.title,
            category: selectedGroup.category,
            knowledgeBase: selectedGroup.knowledgeBase,
            details: mergedArticle.details,
            kb_number: createdArticle.number,
            sys_id: createdArticle.sys_id,
        });

        setActiveTab('merged-article');
    };

    const resetState = useCallback(() => {
        setActiveTab('group-list');
        setSelectedGroup(null);
        setIsEditing(false);
        setMergedArticleHtml(null);
        setMergedArticleMetadata(null);
        mergeDuplicateKBArticlesMutaion.reset();
    }, []);

    const handleGroupSelect = (group: DuplicateGroup) => {
        setSelectedGroup(group);
        setActiveTab('selected-group');
    };

    const handleGoBackToList = async () => {
        if (await unsavedGuard.confirm(!canGoBackToListFreely)) {
            resetState();
        }
    };

    const handleClose = async () => {
        if (await unsavedGuard.confirm(!canCloseFreely)) {
            resetState();
            onClose();
        }
    };

    return (
        <>
            <Modal
                keepMounted
                size={MODAL_SIZES[activeTab]}
                className="p-0"
                open={isOpen}
                onClose={handleClose}
                closeOnEscapeKeyDown={canCloseFreely}
                closeOnOutsideClick={canCloseFreely}
            >
                <Modal.Header className="p-2 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                    {HEADER_TITLES[activeTab]}
                </Modal.Header>

                <Modal.Body className="px-0 py-2 m-0">
                    {activeTab === 'group-list' ? (
                        <div className="flex flex-col">
                            {/* Toolbar - search + category multiselect filter (top right) */}
                            <div className="flex items-center justify-end gap-2 px-3 pb-2 pt-1">
                                <div className="relative w-full max-w-xs">
                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={groupSearchTerm}
                                        onChange={(e) => setGroupSearchTerm(e.target.value)}
                                        placeholder="Search by KB number or title..."
                                        className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-600 outline-none transition-colors focus:border-(--brand-title-primary-color)"
                                    />
                                    {groupSearchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setGroupSearchTerm('')}
                                            aria-label="Clear search"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                                <div className="w-56 shrink-0">
                                    <MultiSelectInput
                                        value={selectedCategories}
                                        onChange={setSelectedCategories}
                                        options={categoryOptions}
                                        placeholder="Filter by category"
                                        maxChips={1}
                                    />
                                </div>
                            </div>

                            <Suspense name="DuplcateKBArticlesGroupList-Suspense" fallback={<GridSkeleton cols={2} rows={1} className="p-2" />}>
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
                        />
                    ) : null}

                    {activeTab === 'merged-article' && mergedArticleHtml ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 py-2">
                            {/* Merged Article */}
                            <div className="flex flex-col gap-1.5">
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
                                    <h1 className="text-sm 2xl:text-base text-(--brand-text-color) font-semibold">Comprehensive Merged Content</h1>
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
                            <div className="flex flex-col gap-1.5">
                                <p>
                                    <TitleWithArraow title="Merge Analytics" className="p-0 text-sm" showArrow={false} />
                                </p>
                                <section className="flex flex-col max-h-[65dvh] overflow-x-auto gap-3">
                                    <MergeArticleDetailsSection>
                                        <MergeArticleDetailsSection.Title>Language and Professionalism</MergeArticleDetailsSection.Title>
                                        <MergeArticleDetailsSection.Body>
                                            {mergedArticleMetadata?.details?.grammar.map((p: string) => (
                                                <MergeArticleDetailsSection.BodyItem key={p}>{p}</MergeArticleDetailsSection.BodyItem>
                                            ))}
                                        </MergeArticleDetailsSection.Body>
                                    </MergeArticleDetailsSection>
                                    <MergeArticleDetailsSection>
                                        <MergeArticleDetailsSection.Title>Enrichment</MergeArticleDetailsSection.Title>
                                        <MergeArticleDetailsSection.Body>
                                            {mergedArticleMetadata?.details?.overlapping.map((p: string) => (
                                                <MergeArticleDetailsSection.BodyItem key={p}>{p}</MergeArticleDetailsSection.BodyItem>
                                            ))}
                                        </MergeArticleDetailsSection.Body>
                                    </MergeArticleDetailsSection>
                                    <MergeArticleDetailsSection>
                                        <MergeArticleDetailsSection.Title>Contradictory</MergeArticleDetailsSection.Title>
                                        <MergeArticleDetailsSection.Body>
                                            {mergedArticleMetadata?.details?.conflicting.map((p: string) => (
                                                <MergeArticleDetailsSection.BodyItem key={p}>{p}</MergeArticleDetailsSection.BodyItem>
                                            ))}
                                        </MergeArticleDetailsSection.Body>
                                    </MergeArticleDetailsSection>
                                    <MergeArticleDetailsSection>
                                        <MergeArticleDetailsSection.Title>Redundant</MergeArticleDetailsSection.Title>
                                        <MergeArticleDetailsSection.Body>
                                            {mergedArticleMetadata?.details?.complementary.map((p: string) => (
                                                <MergeArticleDetailsSection.BodyItem key={p}>{p}</MergeArticleDetailsSection.BodyItem>
                                            ))}
                                        </MergeArticleDetailsSection.Body>
                                    </MergeArticleDetailsSection>
                                </section>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === 'update-article-form' && mergedArticleHtml && mergedArticleMetadata ? (
                        <div className="w-full bg-white px-6 py-5">
                            <GoBackButton onClick={() => setActiveTab('merged-article')} title="Go back to merged article details" />
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
                        </div>
                    ) : null}

                    {activeTab === 'success' && updatedArticle && (
                        <div className="w-full bg-white px-6 py-8 flex flex-col items-center gap-4 text-sm">
                            <div className="flex items-center justify-center size-14 rounded-full bg-blue-100">
                                <CheckCircle size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-semibold text-blue-700">Success !</h3>
                            <div className="flex flex-col items-center gap-4 text-md font-bold text-(--brand-text-gray)">
                                <span>Article #{updatedArticle.number} created Sucessfully</span>
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
                </Modal.Body>

                <Modal.Footer className="p-2 flex justify-center items-start">
                    {activeTab === 'group-list' ? (
                        <Modal.ActionButton variant="brand" onClick={handleClose} className="w-[50%] max-w-40">
                            Close
                        </Modal.ActionButton>
                    ) : null}

                    {activeTab === 'selected-group' ? (
                        <>
                            <Modal.ActionButton variant="brand" onClick={handleGoBackToList} className="w-[50%] max-w-40">
                                Go back to List
                            </Modal.ActionButton>
                            <Modal.ActionButton
                                onClick={handleMergeDuplicateArticles}
                                disabled={isMergeDuplicateKBArticlesMutaionPending}
                                variant="brand"
                                className="w-[50%] max-w-40"
                            >
                                {isMergeDuplicateKBArticlesMutaionPending && <LoaderCircle size={12} className="animate-spin" />}
                                {isMergeDuplicateKBArticlesMutaionPending ? 'Merging...' : 'Merge Articles'}
                            </Modal.ActionButton>
                        </>
                    ) : null}

                    {activeTab === 'merged-article' ? (
                        <>
                            {isEditing ? (
                                <>
                                    <Modal.ActionButton onClick={() => editorActionsRef.current?.discard()} variant="brand" className="w-[50%] max-w-40">
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
                                        <Pencil size={14} />
                                        Edit
                                    </Modal.ActionButton>
                                    <Modal.ActionButton onClick={() => setActiveTab('update-article-form')} variant="brand" className="w-[50%] max-w-40">
                                        <Save size={14} />
                                        Save Merged Article
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
                            <Modal.ActionButton variant="brand" onClick={handleGoBackToList} className="w-[50%] max-w-40">
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

export default MergeDuplicateKBArticlesModal;
