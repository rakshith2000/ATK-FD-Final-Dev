import React, { useCallback, useMemo, useReducer, useRef, useState, Suspense } from 'react';
// import { Route as ProblemAIRoute } from '@/routes/(app)/_app/(itops-ai)/itops-ai/problem-ai';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import HeroSection from '@/shared/components/ui/HeroSection/HeroSection';
import ProblemListHeader from '../components/ui/ProblemListHeader/ProblemListHeader';
import ProblemList from '../components/smart/ProblemList/ProblemList';
import ProblemAssistPanel from '../components/smart/ProblemAssistPanel/ProblemAssistPanel';
import { useProblemTicketsQuery } from '../hooks/useProblemTicketsQuery';
import type { ProblemStatusFilter } from '../constants/problem-status-filter-options';
import problem_placeicon from '../assests/problem_placeicon.png';
import { ChatBot, type ConversationEntry } from '@/shared/components/smart/ChatBot/ChatBot';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import { useDebouncedSearchInput } from '@/shared/hooks/useDebouncedSearchInput';
import { useBlocker } from '@tanstack/react-router';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTechAssistQuery } from '@/shared/modules/atk-backend/hooks/useTechAssistQuery';
import { useGenerateResolutionNotesMutation } from '@/shared/modules/atk-backend/hooks/useGenerateResolutionNotesMutation';
import logger from '@/shared/utils/logger';
import type { SnowTicket, SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import { updateQueriesData } from '@/shared/utils/query-data-updater';
import { listRelevantArticlesResponseToMarkdown, type ListRelevantArticlesResponse } from '@/shared/modules/atk-backend/services/list-relevant-articles';
import deepMerge from '@/shared/utils/deep-merge-object';
import GenerateKBArticleModal from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/GenerateKBArticleModal';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import postTechAssitChatMessage from '@/shared/modules/atk-backend/services/post-tech-assit-chat-message';
import type { RelatedAlert } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-alerts-by-ticket-sys-id';
import type { RelatedIncident } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-incidents-by-cmdb-ci-id';
import { Tooltip } from '@mui/material';
import Modal from '@/shared/components/ui/Modal/Modal';
import { AlertTriangle, BookOpen, FileText } from 'lucide-react';
import { useTicketRelatedQueries } from '../hooks/useTicketRelatedQueries';
import {
    backToTicketList,
    changeTicketAssignmentFilter,
    changeTicketStateAndPriorityFilter,
    closeKbArticleModal,
    confirmGenerateKbArticle,
    dismissNoKbPrompt,
    problemAIReducer,
    initialState,
    resetTicketSelection,
    selectTicket,
    setTicketSearchValue,
    unselectTicket,
    showNoKbPrompt as showNoKbPromptAction,
} from '../store/problemAIStore';
import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import type { UpdateProblemTicketFormImperativeHandle } from '../components/smart/ProblemUpdateTicketForm/ProblemUpdateTicketForm';
import ProblemTicketsQueryBar from '../components/ui/ProblemTicketsQueryBar/ProblemTicketsQueryBar';
import ProblemTicketsList from '../components/smart/ProblemTicketsList/ProblemTicketsList';
import ProblemTicketMetaDetailsCard from '../components/ui/ProblemTicketMetaDetailsCard/ProblemTicketMetaDetailsCard';
import RelatedSection from '@/shared/components/ui/RelatedSection/RelatedSection';
import { useUserMemberOfSnowAssignementGrpupsQuery } from '@/shared/modules/servicenow/hooks/useUserMemberOfSnowAssignementGroupsQuery';
import useProblemListByAssignmentType from '../hooks/useProblemListByAssignmentType';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import SnowTicketAttachmentActions from '@/shared/modules/servicenow/components/SnowTicketAttachmentActions/SnowTicketAttachmentActions';
import { IoClose } from 'react-icons/io5';
import { appConfig } from '@/config/app-config';
import type UpdateProblemTicketFormHybridModule from '../components/smart/ProblemUpdateTicketForm/ProblemUpdateTicketForm_Hybrid';
import type { FormImperativeHandle } from '@/shared/modules/dynamic-form/types';

type TypeUpdateProblemTicketFormHybridModule = { default: typeof UpdateProblemTicketFormHybridModule };

type ProblemTicketFormHandle = UpdateProblemTicketFormImperativeHandle | FormImperativeHandle;

const UpdateProblemTicketFormLazy = React.lazy(() =>
    appConfig.hybridForms.enableProblemForm
        ? import('../components/smart/ProblemUpdateTicketForm/ProblemUpdateTicketForm_Hybrid')
        : (import('../components/smart/ProblemUpdateTicketForm/ProblemUpdateTicketForm') as unknown as Promise<TypeUpdateProblemTicketFormHybridModule>),
);

const ProblemAIPage: React.FC = () => {
    // const { number: incomingProblemNumber } = ProblemAIRoute.useSearch();

    // const [status, setStatus] = useState<ProblemStatusFilter>(incomingProblemNumber ? 'Approved' : 'Recommended');
    const [status, setStatus] = useState<ProblemStatusFilter>('Recommended');
    const [search, setSearch] = useState('');
    const [selectedTicketId_prb, setSelectedTicketId_prb] = useState<string | null>(null);

    const ticketsQuery = useProblemTicketsQuery({ status, search });

    const selectedTicket_prb = useMemo(() => ticketsQuery.data?.find((t) => t.id === selectedTicketId_prb) ?? null, [ticketsQuery.data, selectedTicketId_prb]);

    // from incient page
    const [state, dispatch] = useReducer(problemAIReducer, initialState);
    const { ticketSearchValue, ticketAssignmentFilter, ticketStateFilter, ticketPriorityFilter, selectedTicketId, showTicketUpdateForm, showNoKbPrompt, kbArticleIssue } = state;
    const updateTicketformRef = useRef<ProblemTicketFormHandle>(null);
    const conversationHistoryRef = useRef<ConversationEntry[]>([]);

    const unsavedGuard = useConfirmUnsavedChanges();
    const isFormDirtyRef = useRef(false);

    const search_prb = useDebouncedSearchInput(
        ticketSearchValue,
        async (value) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                dispatch(setTicketSearchValue(value));
            }
        },
        500,
    );

    const searchValue = useDebouncedSearchInput(
        search,
        async (value) => {
            setSearch(value);
            ticketsQuery.refetch();
        },
        500,
    );

    const routeChangeBlocker = useBlocker({
        withResolver: true,
        enableBeforeUnload: false,
        shouldBlockFn: () => isFormDirtyRef.current,
    });

    const queryClient = useQueryClient();

    const userMemberOfAssignmentGroupsQuery = useUserMemberOfSnowAssignementGrpupsQuery();

    const assignmentGroupQueryString = useMemo(() => {
        return userMemberOfAssignmentGroupsQuery.data?.map((group) => group.value).join(',') ?? '';
    }, [userMemberOfAssignmentGroupsQuery.data]);

    const problemListQueryByAssignmentFilter = useProblemListByAssignmentType({
        assignmentType: ticketAssignmentFilter,
        limit: 20,
        searchTerm: ticketSearchValue,
        groupQuery: assignmentGroupQueryString,
    });
    const flatProblemList = problemListQueryByAssignmentFilter?.data?.pages?.flatMap((page) => page) ?? [];

    const filteredTickets = useMemo(() => {
        let result = flatProblemList;

        if (ticketStateFilter) {
            result = result.filter((problem) => problem?.state?.value === ticketStateFilter);
        }

        if (ticketPriorityFilter) {
            result = result.filter((problem) => problem?.priority?.value === ticketPriorityFilter);
        }

        return result;
    }, [flatProblemList, ticketStateFilter, ticketPriorityFilter]);

    const selectedTicket = filteredTickets.find((incident) => incident?.sys_id?.value === selectedTicketId);
    const selectedTicketIndex = useMemo(() => filteredTickets.findIndex((t) => t?.sys_id?.value === selectedTicketId), [filteredTickets, selectedTicketId]);

    // const appliedIncomingNumberRef = useRef<string | null>(null);
    // const attemptedTabsRef = useRef<Set<SnowTicketAssignmentFilterType>>(new Set());
    // useEffect(() => {
    //     if (!incomingProblemNumber) return;
    //     if (appliedIncomingNumberRef.current === incomingProblemNumber) return;
    //     appliedIncomingNumberRef.current = incomingProblemNumber;
    //     attemptedTabsRef.current = new Set();
    //     setStatus('Approved');
    //     dispatch(setTicketSearchValue(incomingProblemNumber));
    // }, [incomingProblemNumber]);

    // useEffect(() => {
    //     if (!incomingProblemNumber) return;
    //     if (status !== 'Approved') return;
    //     if (ticketSearchValue !== incomingProblemNumber) return;
    //     if (problemListQueryByAssignmentFilter.isLoading || problemListQueryByAssignmentFilter.isFetching) return;

    //     const match = flatProblemList.find((t) => t?.number?.display_value === incomingProblemNumber || t?.number?.value === incomingProblemNumber);
    //     if (match?.sys_id?.value) {
    //         if (selectedTicketId !== match.sys_id.value) {
    //             dispatch(selectTicket(match.sys_id.value));
    //         }
    //         return;
    //     }

    //     attemptedTabsRef.current.add(ticketAssignmentFilter);
    //     const filterOrder: SnowTicketAssignmentFilterType[] = ['assigned-to-user', 'assignemnt-group', 'unassigned'];
    //     const nextTab = filterOrder.find((f) => !attemptedTabsRef.current.has(f));
    //     if (nextTab) {
    //         dispatch(changeTicketAssignmentFilter(nextTab));
    //         dispatch(setTicketSearchValue(incomingProblemNumber));
    //     }
    // }, [
    //     incomingProblemNumber,
    //     status,
    //     ticketSearchValue,
    //     ticketAssignmentFilter,
    //     flatProblemList,
    //     problemListQueryByAssignmentFilter.isLoading,
    //     problemListQueryByAssignmentFilter.isFetching,
    //     selectedTicketId,
    // ]);

    const { ticketRelatedIncidents, ticketRelatedProblemAlerts, ticketRelatedProblems } = useTicketRelatedQueries({
        selectedTicketId,
        cmdbCiValue: selectedTicket?.cmdb_ci?.value,
    });

    const techAssistQuery = useTechAssistQuery({
        selectedTicketId,
        selectedTicketDetails: selectedTicket,
        enabled: !!selectedTicket && ticketAssignmentFilter === 'assigned-to-user',
    });

    const generateResolutionNotesMutation = useGenerateResolutionNotesMutation();

    // Reset ticket-specific state when ticket changes
    const prevTicketIdRef = useRef(selectedTicketId);
    if (prevTicketIdRef.current !== selectedTicketId) {
        prevTicketIdRef.current = selectedTicketId;
        generateResolutionNotesMutation.reset();
        conversationHistoryRef.current = [];
        isFormDirtyRef.current = false;
    }

    const handleTicketStatusChange = async (state: string) => {
        const isFormRefMissing = !updateTicketformRef;
        const isStateEmpty = !state || state.trim().length <= 0;

        const isNotResolved = state !== '106';

        const hasConversationHistory = conversationHistoryRef.current.length > 0;

        logger.debug({ state, isStateEmpty, isNotResolved, hasConversationHistory });
        const isAlreadyGeneratedOrInProgress = generateResolutionNotesMutation.isPending || generateResolutionNotesMutation.isSuccess;

        if (isStateEmpty || isFormRefMissing || isNotResolved || isAlreadyGeneratedOrInProgress) {
            return;
        }

        if (!hasConversationHistory) {
            return;
        }

        await generateResolutionNotesMutation.mutateAsync(
            { conversation_history: conversationHistoryRef.current },
            {
                onError: () => updateTicketformRef.current?.resetField('state'),
                onSuccess: (data) => {
                    updateTicketformRef.current?.setFieldValue('close_notes', data);
                },
            },
        );
    };

    const handleTicketStatePriorityFiltersChange = useCallback(
        async (stateVal: string | null, priorityVal: string | null) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                dispatch(changeTicketStateAndPriorityFilter(stateVal, priorityVal));
            }
        },
        [unsavedGuard],
    );

    const handleTicketAssignmentFilterChange = useCallback(
        async (assignmentType: SnowTicketAssignmentFilterType) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                requestAnimationFrame(() => {
                    search_prb.clear();
                    dispatch(changeTicketAssignmentFilter(assignmentType));
                    dispatch(unselectTicket());
                });
            }
        },
        [search_prb.clear, unsavedGuard],
    );

    const handleSelectTicket = useCallback(
        async (ticketId: string) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                generateResolutionNotesMutation.reset();
                dispatch(selectTicket(ticketId));
            }
        },
        [unsavedGuard, generateResolutionNotesMutation],
    );

    const handleUnSelectTicketId = useCallback(
        async (_ticketId: string) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                dispatch(unselectTicket());
            }
        },
        [unsavedGuard],
    );

    const handleBackToList = useCallback(async () => {
        if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
            dispatch(backToTicketList());
        }
    }, [unsavedGuard]);

    const handleRefetch = useCallback(async () => {
        if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
            dispatch(resetTicketSelection());
            problemListQueryByAssignmentFilter.refetch();
        }
    }, [unsavedGuard, problemListQueryByAssignmentFilter]);

    const handleProblemRefetch = useCallback(async () => {
        ticketsQuery.refetch();
    }, []);

    const handleFormDirtyChange = useCallback((isDirty: boolean) => {
        isFormDirtyRef.current = isDirty;
    }, []);

    const buildIssueFromTicket = useCallback((ticket: SnowTicket): IssueWithoutKBArticle => {
        return {
            short_description: ticket?.short_description?.value ?? '',
            comments: ticket?.comments_and_work_notes?.display_value ?? '',
            assignment_group: ticket?.assignment_group?.display_value ?? '',
            cmdb_ci: ticket?.cmdb_ci?.display_value ?? '',
            description: ticket?.description?.value ?? '',
            priority: ticket?.priority?.display_value ?? '',
            close_notes: ticket?.close_notes?.value ?? '',
            sys_id: ticket?.sys_id?.value ?? '',
            number: ticket?.number?.display_value ?? '',
            'cmdb_ci.sys_id': ticket?.cmdb_ci?.value ?? '',
            sys_created_on: ticket?.sys_created_on?.value ?? '',
            caller_id: ticket?.caller_id?.display_value ?? '',
            location: ticket?.location?.display_value ?? '',
            state: ticket?.state?.display_value ?? '',
            category: ticket?.category?.display_value ?? '',
            work_notes: ticket?.comments_and_work_notes?.display_value ?? '',
            sys_created_by: ticket?.sys_created_by?.value ?? '',
            assigned_to: ticket?.assigned_to?.display_value ?? '',
            ticket_link: '',
        };
    }, []);

    const updateTicketQueryDataOnTicketFormSuccess = useCallback(
        async ({ updatedTicketResponse, ticketId }: { ticketId: string; updatedTicketResponse: SnowTicket }): Promise<void> => {
            isFormDirtyRef.current = false;

            updateQueriesData<InfiniteData<SnowTicket[]>>(queryClient, {
                queryKeyFilter: (queryKey) => JSON.stringify(queryKey) === JSON.stringify(problemListQueryByAssignmentFilter?.queryKey),
                updater: (prev) => {
                    if (appConfig.isInDemoEnvironment) return prev;

                    if (!prev) return prev;

                    if (typeof prev === 'object' && 'pages' in prev) {
                        const infiniteData = prev;
                        return {
                            ...infiniteData,
                            pages: infiniteData.pages.map((page) =>
                                // Fixed: changed 'incident' -> 'ticket', 'incidentId' -> 'ticketId', 'updatedIncidentResponse' -> 'updatedTicketResponse'
                                page.map((ticket) => (ticket?.sys_id?.value === ticketId ? deepMerge(ticket, updatedTicketResponse) : ticket)),
                            ),
                        };
                    }

                    return prev;
                },
            });

            // Check if the resolved ticket has no KB articles - prompt user to generate one
            const resolvedState = updatedTicketResponse?.state?.value;
            const isResolved = resolvedState && ['106', '107'].includes(resolvedState);
            const techAssistData = queryClient.getQueryData<ListRelevantArticlesResponse>([techAssistQuery.queryKey[0], ticketId]);
            const noKbArticlesFound = techAssistData?.articles_found === false;

            if (isResolved && noKbArticlesFound && ticketAssignmentFilter == 'assigned-to-user') {
                const ticket = filteredTickets.find((t) => t?.sys_id?.value === ticketId);
                if (ticket) {
                    const merged = deepMerge(ticket, updatedTicketResponse);
                    dispatch(showNoKbPromptAction(buildIssueFromTicket(merged)));
                }
            }
        },
        [ticketAssignmentFilter, queryClient, problemListQueryByAssignmentFilter, buildIssueFromTicket, techAssistQuery.queryKey[0]],
    );

    const showingFormOnTicketList = showTicketUpdateForm && ticketAssignmentFilter === 'assigned-to-user';

    if (userMemberOfAssignmentGroupsQuery.isLoading) return <LoadingPlaceholder />;
    if (userMemberOfAssignmentGroupsQuery.isError)
        return (
            <ErrorPlaceholder
                error={userMemberOfAssignmentGroupsQuery.error}
                isRefetching={userMemberOfAssignmentGroupsQuery.isRefetching}
                onRetry={userMemberOfAssignmentGroupsQuery.refetch}
            />
        );

    return status === 'Approved' ? (
        <div key={`approved-${status}`} id="incident-ai" className="flex  page-enter flex-col lg:flex-row w-full h-full  overflow-auto">
            {/* Section 1 -> Ticket Query and Ticket List */}
            <div className="w-full h-full min-h-100 lg:w-[30%] lg:border-r border-(--brand-border-color) [&>div]:lg:border-r-0">
                <ShellLayout className="rounded">
                    <ShellLayout.Header className="px-1 pt-1 pb-1 border-b border-gray-300">
                        <ProblemTicketsQueryBar
                            status={status}
                            onStatusChange={(next) => {
                                setStatus(next);
                                setSelectedTicketId_prb(null);
                            }}
                            selectedAssignmentFilter={ticketAssignmentFilter}
                            onAssignmentFilterClick={handleTicketAssignmentFilterChange}
                            searchValue={search_prb.inputValue}
                            onSearchChange={search_prb.onChange}
                            onSearchSubmit={search_prb.onSubmit}
                            problems={flatProblemList ?? []}
                            ticketStateFilter={ticketStateFilter}
                            ticketPriorityFilter={ticketPriorityFilter}
                            onProblemFiltersChange={handleTicketStatePriorityFiltersChange}
                            isRefetching={problemListQueryByAssignmentFilter.isRefetching}
                            onRefetch={handleRefetch}
                        />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="flex gap-0 flex-col">
                        <ProblemTicketsList
                            filteredTickets={filteredTickets}
                            fetchNextPage={problemListQueryByAssignmentFilter.fetchNextPage}
                            hasNextPage={problemListQueryByAssignmentFilter.hasNextPage}
                            isFetchingNextPage={problemListQueryByAssignmentFilter.isFetchingNextPage}
                            isError={problemListQueryByAssignmentFilter?.isError}
                            isLoading={problemListQueryByAssignmentFilter?.isLoading}
                            isRefetching={problemListQueryByAssignmentFilter?.isRefetching}
                            refetch={problemListQueryByAssignmentFilter?.refetch}
                            error={problemListQueryByAssignmentFilter.error}
                            selectedTicket={selectedTicket}
                            selectedTicketIndex={selectedTicketIndex}
                            onSelect={handleSelectTicket}
                            onUnSelect={handleUnSelectTicketId}
                            selectedTicketId={selectedTicketId}
                            showTicketUpdateForm={showingFormOnTicketList}
                            selectState={ticketStateFilter}
                            selectedPriority={ticketPriorityFilter}
                            renderForm={(ticket) => {
                                return (
                                    <ShellLayout>
                                        <ShellLayout.Header>
                                            <ProblemTicketMetaDetailsCard
                                                ticketId={ticket?.sys_id}
                                                ticketNumber={ticket?.number}
                                                assignedTo={ticket?.assigned_to}
                                                assignmentGroup={ticket?.assignment_group}
                                                priority={ticket?.priority}
                                                state={ticket?.state}
                                                shortDescription={ticket?.short_description}
                                                openedAt={ticket?.opened_at}
                                                related_incidents={ticket?.related_incidents}
                                                isSelected={true}
                                                config={{ showOpenedAt: true }}
                                                onClick={handleUnSelectTicketId}
                                            />
                                            <div className="flex justify-between items-center px-1 py-1.5 border-b border-(--brand-border-color) brand-box-show-inset">
                                                <span className="text-xs font-semibold text-(--brand-title-primary-color)">Opened by: {ticket?.opened_by?.display_value}</span>
                                                <div className="flex justify-center items-center gap-1">
                                                    {ticket?.sys_id?.value ? (
                                                        <SnowTicketAttachmentActions
                                                            className="border-b border-(--brand-border-color) py-0.5 brand-box-show-inset text-xs font-semibold text-(--brand-title-primary-color) shadow-2xs"
                                                            tableName="problem"
                                                            tableSysId={ticket?.sys_id?.value}
                                                            title={`Problem (${ticket?.number?.display_value}) - Attachments list`}
                                                        />
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={handleBackToList}
                                                        className="flex gap-2 items-center text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                                    >
                                                        <IoClose size={16} className="btn-split split-blue-light rounded-full" />
                                                    </button>
                                                </div>
                                            </div>
                                        </ShellLayout.Header>
                                        <ShellLayout.Body className="h-full">
                                            <Suspense fallback={<LoadingPlaceholder overlay message="Loading form..." />}>
                                                <UpdateProblemTicketFormLazy
                                                    key={ticket?.sys_id?.value}
                                                    ticketId={ticket?.sys_id?.value ?? ''}
                                                    ticketData={ticket}
                                                    onSubmitSuccess={updateTicketQueryDataOnTicketFormSuccess}
                                                    onDirtyChange={handleFormDirtyChange}
                                                    imperativeRef={updateTicketformRef as React.Ref<FormImperativeHandle>}
                                                    isExternalLoading={generateResolutionNotesMutation.isPending}
                                                    isTechAssistPending={techAssistQuery.isFetching}
                                                    onTicketStateChange={handleTicketStatusChange}
                                                />
                                            </Suspense>
                                        </ShellLayout.Body>
                                    </ShellLayout>
                                );
                            }}
                        />
                    </ShellLayout.Body>
                </ShellLayout>
            </div>
            {/* Section 2 -> { Tech Assist, Related Section Analysis } Or Placeolder incase id ticket is not selected */}
            <div className="w-full h-full min-h-100 lg:w-[70%] flex flex-col lg:flex-row gap-0.5 [&>div]:lg:border-l-0">
                {selectedTicketId && selectedTicket ? (
                    <>
                        {/* Section 2.1 - Tech Assist ChatBot */}
                        <div className="w-full h-full min-h-100 lg:w-[63%]">
                            <ShellLayout className="rounded">
                                <ShellLayout.Header>
                                    <TitleWithArraow title={ticketAssignmentFilter === 'assigned-to-user' ? 'TECH ASSIST' : 'TICKET DETAILS'} />
                                </ShellLayout.Header>
                                <ShellLayout.Body>
                                    {ticketAssignmentFilter == 'assigned-to-user' ? (
                                        <ChatBot
                                            key={selectedTicketId}
                                            onConversationChange={(conversation) => {
                                                conversationHistoryRef.current = conversation;
                                            }}
                                            systemMessage={listRelevantArticlesResponseToMarkdown(techAssistQuery?.data)}
                                            isLoading={techAssistQuery.isLoading}
                                            isError={techAssistQuery.isError}
                                            error={techAssistQuery.error}
                                            onRetry={techAssistQuery.refetch}
                                            isRefetching={techAssistQuery.isRefetching}
                                            sendMessage={({ conversation, userMessage }) =>
                                                postTechAssitChatMessage({
                                                    conversation: conversation,
                                                    query: userMessage,
                                                })
                                            }
                                            onResponse={(data) => {
                                                const current = updateTicketformRef.current?.getFieldValue('work_notes') ?? '';
                                                updateTicketformRef.current?.setFieldValue('work_notes', `${current}\n${data.work_notes_and_comments}`.trim());
                                            }}
                                            title="Tech Assist"
                                            placeholder="Ask about this ticket..."
                                            loadingMessage="Setting up Tech Assist..."
                                            skeletonOnInit
                                            skeletonOnPending
                                            skeletonBubbles={1}
                                            skeletonPendingLines={10}
                                        />
                                    ) : (
                                        <Suspense fallback={<LoadingPlaceholder overlay message="Loading form..." />}>
                                            <UpdateProblemTicketFormLazy
                                                key={selectedTicketId}
                                                ticketId={selectedTicketId}
                                                ticketData={selectedTicket}
                                                onSubmitSuccess={updateTicketQueryDataOnTicketFormSuccess}
                                                onDirtyChange={handleFormDirtyChange}
                                                imperativeRef={updateTicketformRef as React.Ref<FormImperativeHandle>}
                                            />
                                        </Suspense>
                                    )}
                                </ShellLayout.Body>
                            </ShellLayout>
                        </div>

                        {/* Section 2.2 - Analysis */}
                        <div className="w-full h-full min-h-100 lg:w-[37%]">
                            <ShellLayout className="rounded">
                                <ShellLayout.Header>
                                    <TitleWithArraow title="ANALYSIS" />
                                </ShellLayout.Header>
                                <ShellLayout.Body className="p-1">
                                    <div className="flex gap-4 flex-nowrap items-center justify-center p-1 pb-4">
                                        <span className="shrink-0 text-xs font-bold">{selectedTicket?.number?.display_value}</span>
                                        <Tooltip title={selectedTicket?.short_description?.display_value ?? ''} placement="bottom-start" arrow followCursor>
                                            <span className="text-[0.70rem] text-(--brand-title-primary-color) cursor-pointer wrap-break-words min-w-0 flex-1">
                                                {(selectedTicket?.short_description?.display_value?.length ?? 0) > 60
                                                    ? `${selectedTicket?.short_description?.display_value?.substring(0, 60)}...`
                                                    : selectedTicket?.short_description?.display_value}
                                            </span>
                                        </Tooltip>
                                    </div>

                                    <RelatedSection<RelatedAlert>
                                        key={`related-problemalerts-${selectedTicketId}`}
                                        isError={ticketRelatedProblemAlerts.isError}
                                        isLoading={ticketRelatedProblemAlerts.isLoading}
                                        items={ticketRelatedProblemAlerts.data}
                                        onRetry={ticketRelatedProblemAlerts.refetch}
                                        isRefetching={ticketRelatedProblemAlerts.isRefetching}
                                        error={ticketRelatedProblemAlerts?.error}
                                        label="Related Problem Alerts"
                                        height="350px"
                                        renderItem={(alert) => (
                                            <ProblemTicketMetaDetailsCard
                                                key={alert?.sys_id?.value}
                                                ticketId={alert?.sys_id}
                                                ticketNumber={alert?.number}
                                                priority={alert?.priority}
                                                state={alert?.state}
                                                shortDescription={alert?.short_description}
                                                openedAt={alert?.source}
                                                severity={alert?.severity}
                                                onClick={(sysId) => window.open(getServiceNowLink({ sysId: sysId, type: 'em_alert' }), '_blank')}
                                                config={{
                                                    disableTooltip: true,
                                                    showOpenedAt: true,
                                                    showAssignedTo: false,
                                                    showAssignmentGroup: false,
                                                    showSeverity: true,
                                                }}
                                            />
                                        )}
                                    />

                                    <RelatedSection<RelatedIncident>
                                        key={`related-incidents-${selectedTicket?.cmdb_ci?.value}-${selectedTicketId}`}
                                        isError={ticketRelatedIncidents.isError}
                                        isLoading={ticketRelatedIncidents.isLoading}
                                        items={ticketRelatedIncidents?.data}
                                        onRetry={ticketRelatedIncidents.refetch}
                                        isRefetching={ticketRelatedIncidents.isRefetching}
                                        error={ticketRelatedIncidents?.error}
                                        label="Related Incidents"
                                        height="350px"
                                        renderItem={(incident) => (
                                            <ProblemTicketMetaDetailsCard
                                                key={incident?.sys_id?.value}
                                                ticketId={incident?.sys_id}
                                                ticketNumber={incident?.number}
                                                priority={incident?.priority}
                                                state={incident?.state}
                                                shortDescription={incident?.short_description}
                                                openedAt={incident?.opened_at}
                                                onClick={(sysId) => window.open(getServiceNowLink({ sysId: sysId, type: 'incident' }), '_blank')}
                                                config={{
                                                    disableTooltip: true,
                                                    showOpenedAt: true,
                                                    showAssignedTo: false,
                                                    showAssignmentGroup: false,
                                                }}
                                            />
                                        )}
                                    />

                                    <RelatedSection<RelatedIncident>
                                        key={`related-problem-${selectedTicket?.cmdb_ci?.value}-${selectedTicketId}`}
                                        isError={ticketRelatedProblems.isError}
                                        isLoading={ticketRelatedProblems.isLoading}
                                        items={ticketRelatedProblems?.data}
                                        onRetry={ticketRelatedProblems.refetch}
                                        isRefetching={ticketRelatedProblems.isRefetching}
                                        error={ticketRelatedProblems?.error}
                                        label="Related Problem"
                                        noDataMessage={
                                            !selectedTicket?.cmdb_ci?.value || selectedTicket?.cmdb_ci?.value.trim()?.length <= 0
                                                ? 'No Configuration Item (CI) available for the selected ticket !'
                                                : undefined
                                        }
                                        height="350px"
                                        renderItem={(incident) => (
                                            <ProblemTicketMetaDetailsCard
                                                key={incident?.sys_id?.value}
                                                ticketId={incident?.sys_id}
                                                ticketNumber={incident?.number}
                                                priority={incident?.priority}
                                                state={incident?.state}
                                                shortDescription={incident?.short_description}
                                                openedAt={incident?.opened_at}
                                                onClick={(sysId) => window.open(getServiceNowLink({ sysId: sysId, type: 'problem' }), '_blank')}
                                                config={{
                                                    disableTooltip: true,
                                                    showOpenedAt: true,
                                                    showAssignedTo: false,
                                                    showAssignmentGroup: false,
                                                }}
                                            />
                                        )}
                                    />
                                </ShellLayout.Body>
                            </ShellLayout>
                        </div>
                    </>
                ) : (
                    <ShellLayout className="h-full min-h-0 w-full rounded">
                        <ShellLayout.Body>
                            <HeroSection
                                title="PROBLEM AI"
                                subTitle="Welcome to Problem AI"
                                description="Choose a ticket to get AI powered assistance"
                                iconImage={problem_placeicon}
                                warning="AI can make mistakes, please validate the response"
                            />
                        </ShellLayout.Body>
                    </ShellLayout>
                )}
            </div>
            {/* Warning ! */}
            <Modal size="sm" className="p-5" open={unsavedGuard.isOpen || routeChangeBlocker.status === 'blocked'} closeButtonClassName={'btn-split split-blue-light'}>
                <div className="flex gap-5 flex-col items-center text-center ">
                    <div className="flex items-center justify-center size-11 rounded-full bg-red-50">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <h2 className="text-sm font-medium text-gray-800">Unsaved Changes</h2>
                </div>

                <span className="text-center">You have unsaved changes in this incident, Continuing will discard all modifications. Are you sure you want to proceed?</span>

                <Modal.Footer className="flex-col">
                    <Modal.ActionButton
                        variant="danger"
                        onClick={() => {
                            isFormDirtyRef.current = false;
                            if (routeChangeBlocker.status === 'blocked') {
                                routeChangeBlocker.proceed();
                            }
                            unsavedGuard.proceed();
                        }}
                    >
                        Discard & Proceed
                    </Modal.ActionButton>
                    <Modal.ActionButton
                        variant="primary"
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

            {/* No KB Article Found Prompt */}
            <Modal size="sm" open={showNoKbPrompt} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} className="pb-5">
                <Modal.Header className="p-4 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base"></Modal.Header>

                <Modal.Body className="px-3">
                    <div className="flex gap-5 flex-col items-center text-center pt-4">
                        <div className="flex items-center justify-center size-11 rounded-full bg-amber-50">
                            <BookOpen size={22} className="text-amber-500" />
                        </div>
                        <h2 className="text-sm font-medium text-gray-800">Generate KB Article for this Issue !</h2>
                    </div>

                    <span className="text-center text-sm text-gray-600">
                        No Knowledge Base article was found for this issue. Would you like to generate a KB article for future reference?
                    </span>
                </Modal.Body>

                <Modal.Footer className="flex-col  px-3">
                    <Modal.ActionButton variant="primary" onClick={() => dispatch(confirmGenerateKbArticle())}>
                        <FileText size={14} />
                        Yes
                    </Modal.ActionButton>
                    <Modal.ActionButton variant="secondary" onClick={() => dispatch(dismissNoKbPrompt())}>
                        No
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* Generate KB Article Modal */}
            <GenerateKBArticleModal issue={showNoKbPrompt ? null : kbArticleIssue} onClose={() => dispatch(closeKbArticleModal())} />
        </div>
    ) : (
        <div key={`approved-${status}`} className="flex page-enter flex-col lg:flex-row w-full h-full overflow-auto">
            {/* Left: list */}
            <div className="w-full lg:w-[30%] h-full min-h-100 2xl:min-h-120 lg:border-r border-(--brand-border-color) [&>div]:lg:border-r-0">
                <ShellLayout className="rounded ">
                    <ShellLayout.Header className="border-b border-(--brand-border-color)">
                        <ProblemListHeader
                            status={status}
                            onStatusChange={(next) => {
                                setStatus(next);
                                setSelectedTicketId_prb(null);
                            }}
                            search={searchValue.inputValue}
                            onSearchChange={searchValue.onChange}
                            onRefetch={handleProblemRefetch}
                            isRefetching={ticketsQuery.isRefetching}
                        />
                    </ShellLayout.Header>
                    <ShellLayout.Body>
                        <ProblemList ticketsQuery={ticketsQuery} status={status} selectedTicketId={selectedTicketId_prb} onSelect={(t) => setSelectedTicketId_prb(t.id)} />
                    </ShellLayout.Body>
                </ShellLayout>
            </div>

            {/* Right: details / placeholder */}
            <div className="w-full lg:w-[70%] h-full min-h-100 2xl:min-h-120 [&>div]:lg:border-l-0">
                {selectedTicket_prb ? (
                    <ProblemAssistPanel key={selectedTicket_prb.id} ticket={selectedTicket_prb} status={status} onClose={() => setSelectedTicketId_prb(null)} />
                ) : (
                    <ShellLayout className="h-full min-h-0 w-full rounded">
                        <ShellLayout.Body>
                            <HeroSection
                                title="PROBLEM AI"
                                subTitle="Welcome to Problem AI"
                                description="Choose a ticket to get AI powered assistance"
                                iconImage={problem_placeicon}
                                warning="AI can make mistakes, please validate the response"
                            />
                        </ShellLayout.Body>
                    </ShellLayout>
                )}
            </div>
        </div>
    );
};

export default ProblemAIPage;
