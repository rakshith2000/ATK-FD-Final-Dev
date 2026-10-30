import { useCallback, useMemo, useReducer, useRef } from 'react';
import TicketsQueryBar from '../components/ui/TicketsQueryBar/TicketsQueryBar';
import type { SnowTicket, SnowTicketAssignmentFilterType, SnowTableName } from '@/shared/modules/servicenow/types/ticket';
import { useDebouncedSearchInput } from '@/shared/hooks/useDebouncedSearchInput';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import useTicketListByAssignmentType from '../hooks/useTicketListByAssignmentType';
import { useUserMemberOfSnowAssignementGrpupsQuery } from '@/shared/modules/servicenow/hooks/useUserMemberOfSnowAssignementGroupsQuery';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import { useTicketRelatedQueries } from '../hooks/useTicketRelatedQueries';
import { useTechAssistQuery } from '@/shared/modules/atk-backend/hooks/useTechAssistQuery';
import ticketTypeOptions from '../constants/ticket-type-options';
import { Tooltip } from '@mui/material';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import TicketMetaDetailsCard from '../components/ui/TicketMetaDetailsCard/TicketMetaDetailsCard';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import postTechAssitChatMessage from '@/shared/modules/atk-backend/services/post-tech-assit-chat-message';
import type { ListRelevantArticlesResponse } from '@/shared/modules/atk-backend/services/list-relevant-articles';
import HeroSection from '@/shared/components/ui/HeroSection/HeroSection';
import incident_placeicon from '../assets/incident_placeicon.png';
import deepMerge from '@/shared/utils/deep-merge-object';
import { FaLongArrowAltLeft } from 'react-icons/fa';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { useBlocker } from '@tanstack/react-router';
import {
    serviceRequestReducer,
    initialState as serviceRequestInitialState,
    setTicketSearchValue,
    selectTicket,
    unselectTicket,
    changeTicketAssignmentFilter,
    changeTicketTypeFilter,
    changeTicketStateAndPriorityFilter,
    backToTicketList,
    resetTicketSelection,
    showNoKbPrompt as showNoKbPromptAction,
    confirmGenerateKbArticle,
    dismissNoKbPrompt,
    closeKbArticleModal,
    type ServiceRequestState,
} from '../store/serviceRequestStore';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import TicketsList from '../components/smart/TicketsList/TicketsList';
import ChatBot from '@/shared/components/smart/ChatBot/ChatBot';
import type { ConversationEntry } from '@/shared/components/smart/ChatBot/ChatBot';
import UpdateTicketForm, { type UpdateTicketFormImperativeHandle } from '../components/smart/UpdateTicketForm/UpdateTicketForm';
import { useGenerateResolutionNotesMutation } from '@/shared/modules/atk-backend/hooks/useGenerateResolutionNotesMutation';
import { updateQueriesData } from '@/shared/utils/query-data-updater';
import { listRelevantArticlesResponseToMarkdown } from '@/shared/modules/atk-backend/services/list-relevant-articles';
import GenerateKBArticleModal from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/GenerateKBArticleModal';
import { BookOpen, FileText } from 'lucide-react';
import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import RelatedSection from '@/shared/components/ui/RelatedSection/RelatedSection';
import { appConfig } from '@/config/app-config';
import { useTicketFieldChoiceQuery } from '@/shared/modules/servicenow/hooks/useTicketFieldChoiceQuery';

// Service Request has its own store/components mirrored from Incident AI; the default ticket type is sc_request.
const initialState: ServiceRequestState = {
    ...serviceRequestInitialState,
    ticketTypeFilter: 'sc_request',
};

const ServiceRequestPage: React.FC = () => {
    const [state, dispatch] = useReducer(serviceRequestReducer, initialState);

    const updateTicketformRef = useRef<UpdateTicketFormImperativeHandle>(null);
    const conversationHistoryRef = useRef<ConversationEntry[]>([]);

    const unsavedGuard = useConfirmUnsavedChanges();
    const isFormDirtyRef = useRef(false);

    const {
        ticketSearchValue,
        ticketAssignmentFilter,
        ticketTypeFilter,
        ticketStateFilter,
        ticketPriorityFilter,
        selectedTicketId,
        showTicketUpdateForm,
        showNoKbPrompt,
        kbArticleIssue,
    } = state;

    const searchResetRef = useRef<() => void>(() => {});

    const search = useDebouncedSearchInput(ticketSearchValue, async (value) => {
        if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
            dispatch(setTicketSearchValue(value));
        } else {
            searchResetRef.current();
        }
    });
    searchResetRef.current = search.reset;

    const routeChangeBlocker = useBlocker({
        withResolver: true,
        enableBeforeUnload: false,
        shouldBlockFn: () => isFormDirtyRef.current,
    });

    const queryClient = useQueryClient();

    const ticketRequestStateChoiceQuery = useTicketFieldChoiceQuery(ticketTypeFilter, 'request_state');

    const userMemberOfAssignmentGroupsQuery = useUserMemberOfSnowAssignementGrpupsQuery();

    const assignmentGroupQueryString = useMemo(() => {
        return userMemberOfAssignmentGroupsQuery.data?.map((group) => group.value).join(',') ?? '';
    }, [userMemberOfAssignmentGroupsQuery.data]);

    const ticketListQuery = useTicketListByAssignmentType({
        ticketType: ticketTypeFilter,
        assignmentType: ticketAssignmentFilter,
        limit: 20,
        searchTerm: ticketSearchValue,
        groupQuery: assignmentGroupQueryString,
    });

    const flatTicketList = ticketListQuery?.data?.pages?.flatMap((page) => page) ?? [];

    const filteredTickets = useMemo(() => {
        let result = flatTicketList;

        if (ticketStateFilter) {
            result = result.filter((ticket) => ticket?.state?.value === ticketStateFilter);
        }

        if (ticketPriorityFilter) {
            result = result.filter((ticket) => ticket?.priority?.value === ticketPriorityFilter);
        }

        return result;
    }, [flatTicketList, ticketStateFilter, ticketPriorityFilter]);

    const selectedTicket = filteredTickets.find((ticket) => ticket?.sys_id?.value === selectedTicketId);

    const selectedTicketIndex = useMemo(() => filteredTickets.findIndex((t) => t?.sys_id?.value === selectedTicketId), [filteredTickets, selectedTicketId]);

    const { userRelatedRequests, relatedRequests } = useTicketRelatedQueries({
        selectedTicketId,
        requestedForValue: selectedTicket?.requested_for?.value,
        shortDescription: selectedTicket?.short_description?.value,
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

        // const isIncidentNotResolved = ticketTypeFilter === 'incident' && state !== '6';
        // const isProblemTaskNotResolved = ticketTypeFilter === 'problem_task' && state !== '157';
        const isServiceRequestNotResolved = ticketTypeFilter === 'sc_request' && !['closed_complete', 'closed_skipped', 'closed_incomplete'].includes(state);
        // const isNotResolved = isIncidentNotResolved || isProblemTaskNotResolved || isServiceRequestNotResolved;

        const hasConversationHistory = conversationHistoryRef.current.length > 0;

        // logger.debug({ state, isStateEmpty, isIncidentNotResolved, isProblemTaskNotResolved, isServiceRequestNotResolved, isNotResolved, hasConversationHistory });
        const isAlreadyGeneratedOrInProgress = generateResolutionNotesMutation.isPending || generateResolutionNotesMutation.isSuccess;

        if (isStateEmpty || isFormRefMissing || isServiceRequestNotResolved || isAlreadyGeneratedOrInProgress) {
            return;
        }

        if (!hasConversationHistory) {
            return;
        }

        await generateResolutionNotesMutation.mutateAsync(
            { conversation_history: conversationHistoryRef.current },
            {
                onError: () => updateTicketformRef.current?.resetField('request_state'),
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
                search.clear();
                dispatch(changeTicketAssignmentFilter(assignmentType));
            }
        },
        [search.clear, unsavedGuard],
    );

    const handleTicketTypeFilterChange = useCallback(
        async (option: { label: string; value: SnowTableName }) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                search.clear();
                dispatch(changeTicketTypeFilter(option.value));
            }
        },
        [search.clear, unsavedGuard],
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
            ticketListQuery.refetch();
        }
    }, [unsavedGuard, ticketListQuery]);

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
                queryKeyFilter: (queryKey) => JSON.stringify(queryKey) === JSON.stringify(ticketListQuery?.queryKey),
                updater: (prev) => {
                    if (appConfig.isInDemoEnvironment) return prev;
                    if (!prev) return prev;
                    if (typeof prev === 'object' && 'pages' in prev) {
                        const infiniteData = prev;
                        return {
                            ...infiniteData,
                            pages: infiniteData.pages.map((page) => page.map((ticket) => (ticket?.sys_id?.value === ticketId ? deepMerge(ticket, updatedTicketResponse) : ticket))),
                        };
                    }

                    return prev;
                },
            });

            // Check if the resolved ticket has no KB articles - prompt user to generate one
            const resolvedState = updatedTicketResponse?.state?.value;
            const isResolved = resolvedState && ['3', '6', '7', '157'].includes(resolvedState);
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
        [ticketAssignmentFilter, queryClient, ticketListQuery, buildIssueFromTicket, techAssistQuery.queryKey[0], filteredTickets],
    );

    const showingFormOnTicketList = showTicketUpdateForm && ticketAssignmentFilter === 'assigned-to-user';

    if (ticketRequestStateChoiceQuery.isLoading) return <LoadingPlaceholder />;
    if (ticketRequestStateChoiceQuery.isError)
        return (
            <ErrorPlaceholder
                error={ticketRequestStateChoiceQuery.error}
                isRefetching={ticketRequestStateChoiceQuery.isRefetching}
                onRetry={ticketRequestStateChoiceQuery.refetch}
            />
        );

    if (userMemberOfAssignmentGroupsQuery.isLoading) return <LoadingPlaceholder />;
    if (userMemberOfAssignmentGroupsQuery.isError)
        return (
            <ErrorPlaceholder
                error={userMemberOfAssignmentGroupsQuery.error}
                isRefetching={userMemberOfAssignmentGroupsQuery.isRefetching}
                onRetry={userMemberOfAssignmentGroupsQuery.refetch}
            />
        );

    return (
        <div id="service-request" className="flex flex-col lg:flex-row w-full h-full gap-0.5 overflow-auto">
            {/* Section 1 -> Ticket Query and Ticket List */}
            <div className="w-full h-full min-h-100 lg:w-[30%]">
                <ShellLayout className="rounded">
                    <ShellLayout.Header className="px-1 pt-1 pb-1 border-b border-gray-300">
                        <TicketsQueryBar
                            key="query-bar"
                            ticketType={ticketTypeFilter}
                            onTicketTypeOptionClick={handleTicketTypeFilterChange}
                            ticketTypeOptions={ticketTypeOptions}
                            selectedAssignmentFilter={ticketAssignmentFilter}
                            onAssignmentFilterClick={handleTicketAssignmentFilterChange}
                            searchValue={search.inputValue}
                            onSearchChange={search.onChange}
                            onSearchSubmit={search.onSubmit}
                            tickets={flatTicketList}
                            stateChoices={ticketRequestStateChoiceQuery?.data ?? []}
                            ticketStateFilter={ticketStateFilter}
                            ticketPriorityFilter={ticketPriorityFilter}
                            onTicketFiltersChange={handleTicketStatePriorityFiltersChange}
                            isStateOptionsLoading={ticketRequestStateChoiceQuery.isLoading}
                            isRefetching={ticketListQuery.isRefetching}
                            onRefetch={handleRefetch}
                        />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="flex gap-0 flex-col">
                        <TicketsList
                            ticketList={filteredTickets}
                            fetchNextPage={ticketListQuery.fetchNextPage}
                            hasNextPage={ticketListQuery.hasNextPage}
                            isFetchingNextPage={ticketListQuery.isFetchingNextPage}
                            isError={ticketListQuery.isError}
                            isLoading={ticketListQuery.isLoading}
                            isRefetching={ticketListQuery.isRefetching}
                            refetch={ticketListQuery.refetch}
                            error={ticketListQuery.error}
                            selectedTicket={selectedTicket}
                            selectedTicketIndex={selectedTicketIndex}
                            onSelect={handleSelectTicket}
                            onUnSelect={handleUnSelectTicketId}
                            selectedTicketId={selectedTicketId}
                            showTicketUpdateForm={showingFormOnTicketList}
                            selectState={ticketStateFilter}
                            selectedPriority={ticketPriorityFilter}
                            renderForm={(ticket) => (
                                <ShellLayout>
                                    <ShellLayout.Header>
                                        <TicketMetaDetailsCard
                                            ticketId={ticket?.sys_id}
                                            ticketNumber={ticket?.number}
                                            assignedTo={ticket?.assigned_to}
                                            assignmentGroup={ticket?.assignment_group}
                                            priority={ticket?.priority}
                                            state={ticket?.request_state}
                                            shortDescription={ticket?.short_description}
                                            openedAt={ticket?.opened_at}
                                            isSelected={true}
                                            config={{ showOpenedAt: true }}
                                            onClick={handleUnSelectTicketId}
                                        />
                                        <div className="flex justify-between items-center px-3 py-2 border-b border-(--brand-border-color) brand-box-show-inset">
                                            <span className="text-xs font-semibold text-(--brand-title-primary-color)">Opened by: {ticket?.opened_by?.display_value}</span>
                                            <button
                                                type="button"
                                                onClick={handleBackToList}
                                                className="flex gap-2 items-center text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                            >
                                                <FaLongArrowAltLeft /> Back to list
                                            </button>
                                        </div>
                                    </ShellLayout.Header>
                                    <ShellLayout.Body className="h-full">
                                        <UpdateTicketForm
                                            key={ticket?.sys_id?.value}
                                            ticketId={ticket?.sys_id?.value ?? ''}
                                            ticketType={ticketTypeFilter}
                                            ticketData={ticket}
                                            onSubmitSuccess={updateTicketQueryDataOnTicketFormSuccess}
                                            onDirtyChange={handleFormDirtyChange}
                                            imperativeRef={updateTicketformRef}
                                            isExternalLoading={generateResolutionNotesMutation.isPending}
                                            isTechAssistPending={techAssistQuery.isFetching}
                                            onTicketStateChange={handleTicketStatusChange}
                                        />
                                    </ShellLayout.Body>
                                </ShellLayout>
                            )}
                        />
                    </ShellLayout.Body>
                </ShellLayout>
            </div>
            {/* Section 2 -> { Tech Assist, Related Section Analysis } Or Placeolder incase id ticket is not selected */}
            <div className="w-full h-full min-h-100 lg:w-[70%] flex flex-col lg:flex-row gap-0.5">
                {selectedTicketId && selectedTicket ? (
                    <>
                        {/* Section 2.1 - Tech Assist ChatBot */}
                        <div className="w-full h-full min-h-100 lg:w-[63%]">
                            <ShellLayout className="rounded">
                                <ShellLayout.Header>
                                    <TitleWithArraow title={ticketAssignmentFilter === 'assigned-to-user' ? 'TECH ASSIST' : 'Ticket Details'} />
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
                                        <UpdateTicketForm
                                            key={selectedTicketId}
                                            ticketId={selectedTicketId}
                                            ticketType={ticketTypeFilter}
                                            ticketData={selectedTicket}
                                            onSubmitSuccess={updateTicketQueryDataOnTicketFormSuccess}
                                            onDirtyChange={handleFormDirtyChange}
                                        />
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
                                    <RelatedSection<SnowTicket>
                                        key={`user-related-requests-${selectedTicket?.requested_for?.value}-${selectedTicketId}`}
                                        isError={userRelatedRequests.isError}
                                        isLoading={userRelatedRequests.isLoading}
                                        items={userRelatedRequests?.data}
                                        onRetry={userRelatedRequests.refetch}
                                        isRefetching={userRelatedRequests.isRefetching}
                                        error={userRelatedRequests?.error}
                                        label="User Related Requests"
                                        noDataMessage={
                                            !selectedTicket?.requested_for?.value || selectedTicket?.requested_for?.value.trim()?.length <= 0
                                                ? 'No requested-for user available for the selected ticket !'
                                                : undefined
                                        }
                                        height="350px"
                                        renderItem={(request) => (
                                            <TicketMetaDetailsCard
                                                key={request?.sys_id?.value}
                                                ticketId={request?.sys_id}
                                                ticketNumber={request?.number}
                                                priority={request?.priority}
                                                state={request?.request_state}
                                                shortDescription={request?.short_description}
                                                openedAt={request?.opened_at}
                                                onClick={(sysId) => window.open(getServiceNowLink({ sysId: sysId, type: 'sc_request' }), '_blank')}
                                                config={{
                                                    disableTooltip: true,
                                                    showOpenedAt: true,
                                                    showAssignedTo: false,
                                                    showAssignmentGroup: false,
                                                }}
                                            />
                                        )}
                                    />
                                    <RelatedSection<SnowTicket>
                                        key={`related-requests-${selectedTicketId}`}
                                        isError={relatedRequests.isError}
                                        isLoading={relatedRequests.isLoading}
                                        items={relatedRequests?.data}
                                        onRetry={relatedRequests.refetch}
                                        isRefetching={relatedRequests.isRefetching}
                                        error={relatedRequests?.error}
                                        label="Related Requests"
                                        noDataMessage={
                                            !selectedTicket?.short_description?.value || selectedTicket?.short_description?.value.trim()?.length <= 0
                                                ? 'No short description available for the selected ticket !'
                                                : undefined
                                        }
                                        height="350px"
                                        renderItem={(request) => (
                                            <TicketMetaDetailsCard
                                                key={request?.sys_id?.value}
                                                ticketId={request?.sys_id}
                                                ticketNumber={request?.number}
                                                priority={request?.priority}
                                                state={request?.request_state}
                                                shortDescription={request?.short_description}
                                                openedAt={request?.opened_at}
                                                onClick={(sysId) => window.open(getServiceNowLink({ sysId: sysId, type: 'sc_request' }), '_blank')}
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
                                title="SERVICE REQUEST"
                                subTitle="Welcome to Service Request"
                                warning="AI can make mistakes, please validate the response"
                                description="Choose a request to get AI powered assistance"
                                iconImage={incident_placeicon}
                            />
                        </ShellLayout.Body>
                    </ShellLayout>
                )}
            </div>
            {/* Warning ! */}
            <Modal size="sm" open={unsavedGuard.isOpen || routeChangeBlocker.status === 'blocked'}>
                <Modal.Header className="flex-col items-center text-center pt-2">
                    <div className="flex items-center justify-center size-11 rounded-full bg-red-50">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <h2 className="text-sm font-medium text-gray-800">Unsaved Changes</h2>
                </Modal.Header>

                <Modal.Body className="text-center">
                    You have unsaved changes in this ticket. Continuing will discard all modifications. Are you sure you want to proceed?
                </Modal.Body>

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
            <Modal size="sm" open={showNoKbPrompt} closeOnEscapeKeyDown={false} closeOnOutsideClick={false}>
                <Modal.Header className="flex-col items-center text-center pt-4">
                    <div className="flex items-center justify-center size-11 rounded-full bg-amber-50">
                        <BookOpen size={22} className="text-amber-500" />
                    </div>
                    <h2 className="text-sm font-medium text-gray-800">Generate KB Article for this Issue !</h2>
                </Modal.Header>

                <Modal.Body className="text-center text-sm text-gray-600">
                    No Knowledge Base article was found for this issue. Would you like to generate a KB article for future reference?
                </Modal.Body>

                <Modal.Footer className="flex-col">
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
    );
};

export default ServiceRequestPage;
