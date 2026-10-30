import React, { Suspense, useCallback, useMemo, useReducer, useRef } from 'react';
import IncidentQueryBar from '../components/ui/IncidentQueryBar/IncidentQueryBar';
import type { SnowTicket, SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import { useDebouncedSearchInput } from '@/shared/hooks/useDebouncedSearchInput';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useIncidentRelatedQueries } from '../hooks/useIncidentRelatedQueries';
import { useTechAssistQuery } from '@/shared/modules/atk-backend/hooks/useTechAssistQuery';
import RelatedSection from '@/shared/components/ui/RelatedSection/RelatedSection';
import { Tooltip } from '@mui/material';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import type { RelatedIncident } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-incidents-by-cmdb-ci-id';
import IncidentMetaDetailsCard from '../components/ui/IncidentMetaDetailsCard/IncidentMetaDetailsCard';
import type { RelatedChange } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-changes-by-cmdb-ci-id';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import type { RelatedAlert } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-alerts-by-ticket-sys-id';
import postTechAssitChatMessage from '@/shared/modules/atk-backend/services/post-tech-assit-chat-message';
import type { ListRelevantArticlesResponse } from '@/shared/modules/atk-backend/services/list-relevant-articles';
import HeroSection from '@/shared/components/ui/HeroSection/HeroSection';
import incident_placeicon from '../assets/incident_placeicon.png';
import deepMerge from '@/shared/utils/deep-merge-object';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { useBlocker } from '@tanstack/react-router';
import {
    incidentAIReducer,
    initialState,
    setIncidentSearchValue,
    selectIncident,
    unselectIncident,
    changeIncidentAssignmentFilter,
    changeIncidentStatePriorityAndAssignmentGroupFilter,
    backToIncidentList,
    resetIncidentSelection,
    showNoKbPrompt as showNoKbPromptAction,
    confirmGenerateKbArticle,
    dismissNoKbPrompt,
    closeKbArticleModal,
} from '../store/incidentAIStore';
import { useConfirmUnsavedChanges } from '@/shared/hooks/useConfirmUnsavedChanges';
import IncidentsList from '../components/ui/IncidentsList/IncidentsList';
import ChatBot from '@/shared/components/smart/ChatBot/ChatBot';
import type { ConversationEntry } from '@/shared/components/smart/ChatBot/ChatBot';
import { useGenerateResolutionNotesMutation } from '@/shared/modules/atk-backend/hooks/useGenerateResolutionNotesMutation';
import logger from '@/shared/utils/logger';
import { updateQueriesData } from '@/shared/utils/query-data-updater';
import { listRelevantArticlesResponseToMarkdown } from '@/shared/modules/atk-backend/services/list-relevant-articles';
import GenerateKBArticleModal from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/GenerateKBArticleModal';
import { BookOpen, FileText } from 'lucide-react';
import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import type { UpdateIncidentFormImperativeHandle } from '../components/smart/UpdateIncidentForm/UpdateIncidentForm_Hybrid';
import useIncidentListByAssignmentType from '../hooks/useIncidentListByAssignmentType';
import { useUserMemberOfSnowAssignementGrpupsQuery } from '@/shared/modules/servicenow/hooks/useUserMemberOfSnowAssignementGroupsQuery';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import { IoClose } from 'react-icons/io5';
import SnowTicketAttachmentActions from '@/shared/modules/servicenow/components/SnowTicketAttachmentActions/SnowTicketAttachmentActions';
import { appConfig } from '@/config/app-config';
import type UpdateIncidentFormHybridModule from '@/modules/incident-ai/components/smart/UpdateIncidentForm/UpdateIncidentForm_Hybrid';

type TypeUpdateIncidentFormHybridModule = { default: typeof UpdateIncidentFormHybridModule };

const UpdateIncidentForm = React.lazy(() =>
    appConfig.hybridForms.enableIncidentForm
        ? import('../components/smart/UpdateIncidentForm/UpdateIncidentForm_Hybrid')
        : (import('../components/smart/UpdateIncidentForm/UpdateIncidentForm') as unknown as Promise<TypeUpdateIncidentFormHybridModule>),
);

const IncidentAIPage: React.FC = () => {
    const [state, dispatch] = useReducer(incidentAIReducer, initialState);

    const {
        incidentSearchValue,
        incidentAssignmentFilter,
        incidentStateFilter,
        incidentPriorityFilter,
        incidentAssignmentGroupFilter,
        selectedIncidentId,
        showIncidentUpdateForm,
        showNoKbPrompt,
        kbArticleIssue,
    } = state;

    const updateIncidentformRef = useRef<UpdateIncidentFormImperativeHandle>(null);
    const conversationHistoryRef = useRef<ConversationEntry[]>([]);

    const unsavedGuard = useConfirmUnsavedChanges();
    const isFormDirtyRef = useRef(false);

    const search = useDebouncedSearchInput(
        incidentSearchValue,
        async (value) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                dispatch(setIncidentSearchValue(value));
            }
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

    const incidentListQueryByAssignmentFilter = useIncidentListByAssignmentType({
        assignmentType: incidentAssignmentFilter,
        limit: 20,
        searchTerm: incidentSearchValue,
        groupQuery: assignmentGroupQueryString,
    });

    const flatIncidentList = incidentListQueryByAssignmentFilter?.data?.pages?.flatMap((page) => page) ?? [];

    const filteredIncidents = useMemo(() => {
        let result = flatIncidentList;

        if (incidentStateFilter) {
            result = result.filter((incident) => incident?.state?.value === incidentStateFilter);
        }

        if (incidentPriorityFilter) {
            result = result.filter((incident) => incident?.priority?.value === incidentPriorityFilter);
        }

        if (incidentAssignmentGroupFilter) {
            result = result.filter((incident) => incident?.assignment_group?.value === incidentAssignmentGroupFilter);
        }

        return result;
    }, [flatIncidentList, incidentStateFilter, incidentPriorityFilter, incidentAssignmentGroupFilter]);

    const selectedIncident = filteredIncidents.find((incident) => incident?.sys_id?.value === selectedIncidentId);

    const selectedIncidentIndex = useMemo(() => filteredIncidents.findIndex((t) => t?.sys_id?.value === selectedIncidentId), [filteredIncidents, selectedIncidentId]);

    const { incidentRelatedIncidents, incidentRelatedChanges, incidentRelatedAlerts } = useIncidentRelatedQueries({
        selectedIncidentId,
        cmdbCiValue: selectedIncident?.cmdb_ci?.value,
    });

    const techAssistQuery = useTechAssistQuery({
        selectedTicketId: selectedIncidentId,
        selectedTicketDetails: selectedIncident,
        enabled: !!selectedIncident && incidentAssignmentFilter === 'assigned-to-user',
    });

    const generateResolutionNotesMutation = useGenerateResolutionNotesMutation();

    const prevIncidentIdRef = useRef(selectedIncidentId);
    if (prevIncidentIdRef.current !== selectedIncidentId) {
        prevIncidentIdRef.current = selectedIncidentId;
        generateResolutionNotesMutation.reset();
        conversationHistoryRef.current = [];
        isFormDirtyRef.current = false;
    }

    const handleIncidentStatusChange = async (state: string) => {
        const isFormRefMissing = !updateIncidentformRef;
        const isStateEmpty = !state || state.trim().length <= 0;

        const isNotResolved = state !== '6';

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
                onError: () => updateIncidentformRef.current?.resetField('state'),
                onSuccess: (data) => {
                    updateIncidentformRef.current?.setFieldValue('close_notes', data);
                },
            },
        );
    };

    const handleIncidentFiltersChange = useCallback(
        async (stateVal: string | null, priorityVal: string | null, assignmentGroupVal: string | null) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                dispatch(changeIncidentStatePriorityAndAssignmentGroupFilter(stateVal, priorityVal, assignmentGroupVal));
            }
        },
        [unsavedGuard],
    );

    const handleIncidentAssignmentFilterChange = useCallback(
        async (assignmentType: SnowTicketAssignmentFilterType) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                requestAnimationFrame(() => {
                    search.clear();
                    dispatch(changeIncidentAssignmentFilter(assignmentType));
                    dispatch(unselectIncident());
                });
            }
        },
        [search.clear, unsavedGuard],
    );

    const handleSelectIncident = useCallback(
        async (incidentId: string) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                generateResolutionNotesMutation.reset();
                dispatch(selectIncident(incidentId));
            }
        },
        [unsavedGuard, generateResolutionNotesMutation],
    );

    const handleUnSelectIncidentId = useCallback(
        async (_incidentId: string) => {
            if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
                dispatch(unselectIncident());
            }
        },
        [unsavedGuard],
    );

    const handleBackToList = useCallback(async () => {
        if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
            dispatch(backToIncidentList());
        }
    }, [unsavedGuard]);

    const handleRefetch = useCallback(async () => {
        if (await unsavedGuard.confirm(isFormDirtyRef.current)) {
            dispatch(resetIncidentSelection());
            incidentListQueryByAssignmentFilter.refetch();
        }
    }, [unsavedGuard, incidentListQueryByAssignmentFilter]);

    const handleFormDirtyChange = useCallback((isDirty: boolean) => {
        isFormDirtyRef.current = isDirty;
    }, []);

    const buildIssueFromIncident = useCallback((incident: SnowTicket): IssueWithoutKBArticle => {
        return {
            short_description: incident?.short_description?.value ?? '',
            comments: incident?.comments_and_work_notes?.display_value ?? '',
            assignment_group: incident?.assignment_group?.display_value ?? '',
            cmdb_ci: incident?.cmdb_ci?.display_value ?? '',
            description: incident?.description?.value ?? '',
            priority: incident?.priority?.display_value ?? '',
            close_notes: incident?.close_notes?.value ?? '',
            sys_id: incident?.sys_id?.value ?? '',
            number: incident?.number?.display_value ?? '',
            'cmdb_ci.sys_id': incident?.cmdb_ci?.value ?? '',
            sys_created_on: incident?.sys_created_on?.value ?? '',
            caller_id: incident?.caller_id?.display_value ?? '',
            location: incident?.location?.display_value ?? '',
            state: incident?.state?.display_value ?? '',
            category: incident?.category?.display_value ?? '',
            work_notes: incident?.comments_and_work_notes?.display_value ?? '',
            sys_created_by: incident?.sys_created_by?.value ?? '',
            assigned_to: incident?.assigned_to?.display_value ?? '',
            ticket_link: '',
        };
    }, []);

    const updateIncidentListQueryDataOnIncidentFormSuccess = useCallback(
        async ({ updatedIncidentResponse, incidentId }: { incidentId: string; updatedIncidentResponse: SnowTicket }): Promise<void> => {
            logger.debug({ updatedIncidentResponse });
            isFormDirtyRef.current = false;
            updateQueriesData<InfiniteData<SnowTicket[]>>(queryClient, {
                queryKeyFilter: (queryKey) => JSON.stringify(queryKey) === JSON.stringify(incidentListQueryByAssignmentFilter?.queryKey),
                updater: (prev) => {
                    if (appConfig.isInDemoEnvironment) return prev;
                    if (!prev) return prev;
                    if (typeof prev === 'object' && 'pages' in prev) {
                        const infiniteData = prev;
                        return {
                            ...infiniteData,
                            pages: infiniteData.pages.map((page) =>
                                page.map((incident) => (incident?.sys_id?.value === incidentId ? deepMerge(incident, updatedIncidentResponse) : incident)),
                            ),
                        };
                    }

                    return prev;
                },
            });

            // Check if the resolved incident has no KB articles - prompt user to generate one
            const resolvedState = updatedIncidentResponse?.state?.value;
            const isResolved = resolvedState && ['6', '7', '157'].includes(resolvedState);
            const techAssistData = queryClient.getQueryData<ListRelevantArticlesResponse>([techAssistQuery.queryKey[0], incidentId]);
            const noKbArticlesFound = techAssistData?.articles_found === false;

            if (isResolved && noKbArticlesFound && incidentAssignmentFilter == 'assigned-to-user') {
                const incident = filteredIncidents.find((t) => t?.sys_id?.value === incidentId);
                if (incident) {
                    const merged = deepMerge(incident, updatedIncidentResponse);
                    dispatch(showNoKbPromptAction(buildIssueFromIncident(merged)));
                }
            }
        },
        [incidentAssignmentFilter, queryClient, incidentListQueryByAssignmentFilter, buildIssueFromIncident, techAssistQuery.queryKey[0]],
    );

    const showingFormOnIncidentList = showIncidentUpdateForm && incidentAssignmentFilter === 'assigned-to-user';

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
        <div id="incident-ai" className="flex flex-col lg:flex-row w-full h-full gap-0.5 overflow-auto">
            {/* Section 1 -> Incident Query and Incident List */}
            <div className="w-full h-full min-h-100 lg:w-[30%]">
                <ShellLayout className="rounded">
                    <ShellLayout.Header className="px-1 pt-1 pb-1 border-b border-gray-300">
                        <IncidentQueryBar
                            key="query-bar"
                            selectedAssignmentFilter={incidentAssignmentFilter}
                            onAssignmentFilterClick={handleIncidentAssignmentFilterChange}
                            searchValue={search.inputValue}
                            onSearchChange={search.onChange}
                            onSearchSubmit={search.onSubmit}
                            incidents={flatIncidentList ?? []}
                            incidentStateFilter={incidentStateFilter}
                            incidentPriorityFilter={incidentPriorityFilter}
                            incidentAssignmentGroupFilter={incidentAssignmentGroupFilter}
                            onIncidentFiltersChange={handleIncidentFiltersChange}
                            isRefetching={incidentListQueryByAssignmentFilter.isRefetching}
                            onRefetch={handleRefetch}
                        />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="flex gap-0 flex-col">
                        <IncidentsList
                            incidentList={filteredIncidents}
                            fetchNextPage={incidentListQueryByAssignmentFilter.fetchNextPage}
                            hasNextPage={incidentListQueryByAssignmentFilter.hasNextPage}
                            isFetchingNextPage={incidentListQueryByAssignmentFilter.isFetchingNextPage}
                            isError={incidentListQueryByAssignmentFilter?.isError}
                            isLoading={incidentListQueryByAssignmentFilter?.isLoading}
                            isRefetching={incidentListQueryByAssignmentFilter?.isRefetching}
                            refetch={incidentListQueryByAssignmentFilter?.refetch}
                            error={incidentListQueryByAssignmentFilter.error}
                            selectedIncident={selectedIncident}
                            selectedIncidentIndex={selectedIncidentIndex}
                            onSelect={handleSelectIncident}
                            onUnSelect={handleUnSelectIncidentId}
                            selectedIncidentId={selectedIncidentId}
                            showIncidentUpdateForm={showingFormOnIncidentList}
                            selectedStateFilter={incidentStateFilter}
                            selectedPriorityFilter={incidentPriorityFilter}
                            selectedAssignmentGroupFilter={incidentAssignmentGroupFilter}
                            renderForm={(incident) => (
                                <ShellLayout>
                                    <ShellLayout.Header>
                                        <IncidentMetaDetailsCard
                                            incidentId={incident?.sys_id}
                                            incidentNumber={incident?.number}
                                            assignedTo={incident?.assigned_to}
                                            severity={incident?.severity}
                                            assignmentGroup={incident?.assignment_group}
                                            priority={incident?.priority}
                                            state={incident?.state}
                                            shortDescription={incident?.short_description}
                                            openedAt={incident?.opened_at}
                                            isSelected={true}
                                            config={{ showOpenedAt: true }}
                                            onClick={handleUnSelectIncidentId}
                                        />
                                        <div className="flex justify-between items-center px-1 py-1.5 border-b border-(--brand-border-color) brand-box-show-inset">
                                            <span className="text-xs font-semibold text-(--brand-title-primary-color)">Opened by: {incident?.opened_by?.display_value}</span>
                                            <div className="flex justify-center items-center gap-1">
                                                {incident?.sys_id?.value ? (
                                                    <SnowTicketAttachmentActions
                                                        className="border-b border-(--brand-border-color) py-0.5 brand-box-show-inset text-xs font-semibold text-(--brand-title-primary-color) shadow-2xs"
                                                        tableName="incident"
                                                        tableSysId={incident?.sys_id?.value}
                                                        title={`Incident (${incident?.number?.display_value}) - Attachments list`}
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
                                        <Suspense fallback={<LoadingPlaceholder />}>
                                            <UpdateIncidentForm
                                                key={incident?.sys_id?.value}
                                                incidentId={incident?.sys_id?.value ?? ''}
                                                incidentData={incident}
                                                onSubmitSuccess={updateIncidentListQueryDataOnIncidentFormSuccess}
                                                onDirtyChange={handleFormDirtyChange}
                                                imperativeRef={updateIncidentformRef}
                                                isExternalLoading={generateResolutionNotesMutation.isPending}
                                                isTechAssistPending={techAssistQuery.isFetching}
                                                onIncidentStateChange={handleIncidentStatusChange}
                                                enableAuditEntries={false}
                                            />
                                        </Suspense>
                                    </ShellLayout.Body>
                                </ShellLayout>
                            )}
                        />
                    </ShellLayout.Body>
                </ShellLayout>
            </div>
            {/* Section 2 -> { Tech Assist, Related Section Analysis } Or Placeolder incase id incident is not selected */}
            <div className="w-full h-full min-h-100 lg:w-[70%] flex flex-col lg:flex-row gap-0.5">
                {selectedIncidentId && selectedIncident ? (
                    <>
                        {/* Section 2.1 - Tech Assist ChatBot */}
                        <div className="w-full h-full min-h-100 lg:w-[63%]">
                            <ShellLayout className="rounded">
                                <ShellLayout.Header>
                                    <TitleWithArraow title={incidentAssignmentFilter === 'assigned-to-user' ? 'TECH ASSIST' : 'Incident Details'} />
                                </ShellLayout.Header>
                                <ShellLayout.Body>
                                    {incidentAssignmentFilter == 'assigned-to-user' ? (
                                        <ChatBot
                                            key={selectedIncidentId}
                                            onConversationChange={(conversation) => {
                                                conversationHistoryRef.current = conversation;
                                            }}
                                            systemMessage={`${listRelevantArticlesResponseToMarkdown(techAssistQuery?.data)}
                                                <div style="display:none;">
                                                    Below is the data of servicenow incident
                                                     ${JSON.stringify(selectedIncident)}
                                                </div>
                                                `}
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
                                                const current = updateIncidentformRef.current?.getFieldValue('work_notes') ?? '';
                                                updateIncidentformRef.current?.setFieldValue('work_notes', `${current}\n${data.work_notes_and_comments}`.trim());
                                            }}
                                            title="Tech Assist"
                                            placeholder="Enter your text here..."
                                            loadingMessage="Setting up Tech Assist..."
                                            skeletonOnInit
                                            skeletonOnPending={false}
                                            skeletonBubbles={1}
                                            skeletonPendingLines={10}
                                        />
                                    ) : (
                                        <Suspense fallback={<LoadingPlaceholder />}>
                                            <UpdateIncidentForm
                                                key={selectedIncidentId}
                                                incidentId={selectedIncidentId}
                                                incidentData={selectedIncident}
                                                onSubmitSuccess={updateIncidentListQueryDataOnIncidentFormSuccess}
                                                onDirtyChange={handleFormDirtyChange}
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
                                        <span className="shrink-0 text-xs font-bold">{selectedIncident?.number?.display_value}</span>
                                        <Tooltip title={selectedIncident?.short_description?.display_value ?? ''} placement="bottom-start" arrow followCursor>
                                            <span className="text-[0.70rem] text-(--brand-title-primary-color) cursor-pointer wrap-break-words min-w-0 flex-1">
                                                {(selectedIncident?.short_description?.display_value?.length ?? 0) > 60
                                                    ? `${selectedIncident?.short_description?.display_value?.substring(0, 60)}...`
                                                    : selectedIncident?.short_description?.display_value}
                                            </span>
                                        </Tooltip>
                                    </div>
                                    <RelatedSection<RelatedAlert>
                                        key={`related-alerts-${selectedIncidentId}`}
                                        isError={incidentRelatedAlerts.isError}
                                        isLoading={incidentRelatedAlerts.isLoading}
                                        items={incidentRelatedAlerts.data}
                                        onRetry={incidentRelatedAlerts.refetch}
                                        isRefetching={incidentRelatedAlerts.isRefetching}
                                        error={incidentRelatedAlerts?.error}
                                        label="Related Alerts"
                                        height="350px"
                                        renderItem={(alert) => (
                                            <IncidentMetaDetailsCard
                                                key={alert?.sys_id?.value}
                                                incidentId={alert?.sys_id}
                                                incidentNumber={alert?.number}
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
                                        key={`related-incidents-${selectedIncident?.cmdb_ci?.value}-${selectedIncidentId}`}
                                        isError={incidentRelatedIncidents.isError}
                                        isLoading={incidentRelatedIncidents.isLoading}
                                        items={incidentRelatedIncidents?.data}
                                        onRetry={incidentRelatedIncidents.refetch}
                                        isRefetching={incidentRelatedIncidents.isRefetching}
                                        error={incidentRelatedIncidents?.error}
                                        label="Related Incidents"
                                        noDataMessage={
                                            !selectedIncident?.cmdb_ci?.value || selectedIncident?.cmdb_ci?.value.trim()?.length <= 0
                                                ? 'No Configuration Item (CI) available for the selected incident !'
                                                : undefined
                                        }
                                        height="350px"
                                        renderItem={(incident) => (
                                            <IncidentMetaDetailsCard
                                                key={incident?.sys_id?.value}
                                                incidentId={incident?.sys_id}
                                                incidentNumber={incident?.number}
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
                                    <RelatedSection<RelatedChange>
                                        key={`related-changes-${selectedIncident?.cmdb_ci?.value}-${selectedIncidentId}`}
                                        isError={incidentRelatedChanges?.isError}
                                        isLoading={incidentRelatedChanges?.isLoading}
                                        items={incidentRelatedChanges?.data}
                                        onRetry={incidentRelatedChanges.refetch}
                                        isRefetching={incidentRelatedChanges.isRefetching}
                                        error={incidentRelatedChanges?.error}
                                        label="Related Changes"
                                        noDataMessage={
                                            !selectedIncident?.cmdb_ci?.value || selectedIncident?.cmdb_ci?.value.trim()?.length <= 0
                                                ? 'No Configuration Item (CI) available for the selected incident !'
                                                : undefined
                                        }
                                        height="350px"
                                        renderItem={(change) => (
                                            <IncidentMetaDetailsCard
                                                key={change?.sys_id?.value}
                                                incidentId={change?.sys_id}
                                                incidentNumber={change?.number}
                                                priority={change?.priority}
                                                state={change?.state}
                                                shortDescription={change?.short_description}
                                                openedAt={change?.opened_at}
                                                onClick={(sysId) => window.open(getServiceNowLink({ sysId: sysId, type: 'change_request' }), '_blank')}
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
                                title="INCIDENT AI"
                                subTitle="Welcome to Incident AI"
                                description="Choose a incident to get AI powered assistance"
                                warning="AI can make mistakes, please validate the response"
                                iconImage={incident_placeicon}
                            />
                        </ShellLayout.Body>
                    </ShellLayout>
                )}
            </div>
            {/* Warning ! */}
            <Modal size="sm" open={unsavedGuard.isOpen || routeChangeBlocker.status === 'blocked'} className="p-5">
                <Modal.Body>
                    <div className="flex gap-5 flex-col items-center text-center pt-2">
                        <div className="flex items-center justify-center size-11 rounded-full bg-red-50">
                            <AlertTriangle size={22} className="text-red-400" />
                        </div>
                        <h2 className="text-sm font-medium text-gray-800 mb-2">Unsaved Changes</h2>
                    </div>
                    <span className="text-center">You have unsaved changes in this incident, Continuing will discard all modifications. Are you sure you want to proceed?</span>
                </Modal.Body>

                <Modal.Footer className="flex-row">
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
            <Modal size="sm" open={showNoKbPrompt} closeOnEscapeKeyDown={false} closeOnOutsideClick={false} className="p-5">
                <Modal.Body>
                    <div className="flex gap-5 flex-col items-center text-center pt-4">
                        <div className="flex items-center justify-center size-11 rounded-full bg-amber-50">
                            <BookOpen size={22} className="text-amber-500" />
                        </div>
                        <h2 className="text-sm font-medium text-gray-800 mb-2">Generate KB Article for this Issue !</h2>
                    </div>
                    <span className="text-center text-sm text-gray-600">
                        No Knowledge Base article was found for this issue. Would you like to generate a KB article for future reference?
                    </span>
                </Modal.Body>

                <Modal.Footer className="flex-row">
                    <Modal.ActionButton variant="brand" onClick={() => dispatch(confirmGenerateKbArticle())}>
                        <FileText size={14} />
                        Yes
                    </Modal.ActionButton>
                    <Modal.ActionButton variant="warning" onClick={() => dispatch(dismissNoKbPrompt())}>
                        No
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* Generate KB Article Modal */}
            <GenerateKBArticleModal issue={showNoKbPrompt ? null : kbArticleIssue} onClose={() => dispatch(closeKbArticleModal())} />
        </div>
    );
};

export default IncidentAIPage;
