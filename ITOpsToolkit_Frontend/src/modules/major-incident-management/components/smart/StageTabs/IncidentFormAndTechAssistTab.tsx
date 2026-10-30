import React, { Suspense } from 'react';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import Tooltip from '@mui/material/Tooltip';
import { appConfig } from '@/config/app-config';
import type UpdateIncidentFormHybridModule from '@/modules/incident-ai/components/smart/UpdateIncidentForm/UpdateIncidentForm_Hybrid';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';

type TypeUpdateIncidentFormHybridModule = { default: typeof UpdateIncidentFormHybridModule };

const UpdateIncidentForm = React.lazy(() =>
    appConfig.hybridForms.enableIncidentForm
        ? import('@/modules/incident-ai/components/smart/UpdateIncidentForm/UpdateIncidentForm_Hybrid')
        : (import('@/modules/incident-ai/components/smart/UpdateIncidentForm/UpdateIncidentForm') as unknown as Promise<TypeUpdateIncidentFormHybridModule>),
);

import ChatBot from '@/shared/components/smart/ChatBot/ChatBot';
import postTechAssitChatMessage from '@/shared/modules/atk-backend/services/post-tech-assit-chat-message';
import RelatedSection from '@/shared/components/ui/RelatedSection/RelatedSection';
import IncidentMetaDetailsCard from '@/modules/incident-ai/components/ui/IncidentMetaDetailsCard/IncidentMetaDetailsCard';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';

import { useIncidentRelatedQueries } from '@/modules/incident-ai/hooks/useIncidentRelatedQueries';
import { useTechAssistQuery } from '@/shared/modules/atk-backend/hooks/useTechAssistQuery';
import { listRelevantArticlesResponseToMarkdown } from '@/shared/modules/atk-backend/services/list-relevant-articles';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import type { RelatedIncident } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-incidents-by-cmdb-ci-id';
import type { RelatedChange } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-changes-by-cmdb-ci-id';
import type { RelatedAlert } from '@/shared/modules/servicenow/services/fetch-snow-ticket-related-alerts-by-ticket-sys-id';
import type { MimDataResponse } from '@/modules/major-incident-management/types';

interface IncidentFormAndTechAssistTabTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const IncidentFormAndTechAssistTab: React.FC<IncidentFormAndTechAssistTabTabProps> = ({ incidentNumber, mimData, reloadQueries, snowIncident }) => {
    const selectedIncidentSysId = snowIncident.sys_id?.value || '';
    const cmdbCiValue = snowIncident.cmdb_ci?.value || '';

    const { incidentRelatedIncidents, incidentRelatedChanges, incidentRelatedAlerts } = useIncidentRelatedQueries({
        selectedIncidentId: selectedIncidentSysId,
        cmdbCiValue,
    });

    const techAssistQuery = useTechAssistQuery({
        selectedTicketId: selectedIncidentSysId,
        selectedTicketDetails: snowIncident,
        enabled: Boolean(selectedIncidentSysId),
    });

    const techAssistMarkdown = `${listRelevantArticlesResponseToMarkdown(techAssistQuery?.data)}
        <div style="display:none;">
            Below is the data of servicenow incident
            ${JSON.stringify(snowIncident)}, ${JSON.stringify(mimData)}
        </div>`;

    return (
        <div className="w-full min-w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0.5 overflow-auto">
            {/* Column 1 (4 cols / 33%): Incident Details Form */}
            <div className="lg:col-span-4 w-full h-full min-h-70 flex flex-col overflow-hidden p-0.5">
                <ShellLayout className="w-full h-full min-h-4 flex flex-col overflow-hidden rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
                    <ShellLayout.Header className="shrink-0">
                        <TitleWithArraow title="Incident Details" />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="w-full flex-1 min-h-0 overflow-y-auto">
                        <Suspense fallback={<LoadingPlaceholder />}>
                            <UpdateIncidentForm
                                key={selectedIncidentSysId}
                                incidentId={selectedIncidentSysId}
                                incidentData={snowIncident}
                                onSubmitSuccess={async () => {
                                    reloadQueries();
                                }}
                            />
                        </Suspense>
                    </ShellLayout.Body>
                </ShellLayout>
            </div>

            {/* Column 2 (5 cols / ~42%): TECH ASSIST ChatBot */}
            <div className="lg:col-span-5 w-full h-full min-h-70 flex flex-col overflow-hidden p-0.5">
                <ShellLayout className="rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 w-full h-full min-h-0 flex flex-col overflow-hidden">
                    <ShellLayout.Header className="shrink-0">
                        <TitleWithArraow title="TECH ASSIST" />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="w-full flex-1 min-h-0 overflow-y-auto">
                        <ChatBot
                            key={selectedIncidentSysId}
                            title="Tech Assist"
                            placeholder="Enter your text here..."
                            loadingMessage="Setting up Tech Assist..."
                            systemMessage={techAssistMarkdown}
                            isLoading={techAssistQuery.isLoading}
                            isError={techAssistQuery.isError}
                            error={techAssistQuery.error}
                            onRetry={techAssistQuery.refetch}
                            isRefetching={techAssistQuery.isRefetching}
                            sendMessage={({ conversation, userMessage }) =>
                                postTechAssitChatMessage({
                                    conversation,
                                    query: userMessage,
                                })
                            }
                            skeletonOnInit
                            skeletonOnPending
                            skeletonBubbles={1}
                            skeletonPendingLines={10}
                        />
                    </ShellLayout.Body>
                </ShellLayout>
            </div>

            {/* Column 3 (3 cols / 25%): ANALYSIS Related Sections */}
            <div className="lg:col-span-3 w-full h-full min-h-70 flex flex-col overflow-hidden p-0.5">
                <ShellLayout className="rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 w-full h-full min-h-0 flex flex-col overflow-hidden">
                    <ShellLayout.Header className="shrink-0">
                        <TitleWithArraow title="ANALYSIS" />
                    </ShellLayout.Header>
                    <ShellLayout.Body className="p-1 w-full flex-1 min-h-0 overflow-y-auto">
                        <div className="flex gap-4 flex-nowrap items-center justify-center p-1 pb-4 shrink-0">
                            <span className="shrink-0 text-xs font-bold">{snowIncident.number?.display_value || incidentNumber}</span>
                            <Tooltip title={snowIncident.short_description?.display_value ?? ''} placement="bottom-start" arrow followCursor>
                                <span className="text-[0.70rem] text-(--brand-title-primary-color) cursor-pointer wrap-break-words min-w-0 flex-1">
                                    {(snowIncident.short_description?.display_value?.length ?? 0) > 60
                                        ? `${snowIncident.short_description?.display_value?.substring(0, 60)}...`
                                        : snowIncident.short_description?.display_value}
                                </span>
                            </Tooltip>
                        </div>

                        {/* Related Alerts */}
                        <RelatedSection<RelatedAlert>
                            key={`related-alerts-${selectedIncidentSysId}`}
                            isError={incidentRelatedAlerts.isError}
                            isLoading={incidentRelatedAlerts.isLoading}
                            items={incidentRelatedAlerts.data}
                            onRetry={incidentRelatedAlerts.refetch}
                            isRefetching={incidentRelatedAlerts.isRefetching}
                            error={incidentRelatedAlerts?.error}
                            label="Related Alerts"
                            height="15rem"
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

                        {/* Related Incidents */}
                        <RelatedSection<RelatedIncident>
                            key={`related-incidents-${cmdbCiValue}-${selectedIncidentSysId}`}
                            isError={incidentRelatedIncidents.isError}
                            isLoading={incidentRelatedIncidents.isLoading}
                            items={incidentRelatedIncidents?.data}
                            onRetry={incidentRelatedIncidents.refetch}
                            isRefetching={incidentRelatedIncidents.isRefetching}
                            error={incidentRelatedIncidents?.error}
                            label="Related Incidents"
                            height="15rem"
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

                        {/* Related Changes */}
                        <RelatedSection<RelatedChange>
                            key={`related-changes-${cmdbCiValue}-${selectedIncidentSysId}`}
                            isError={incidentRelatedChanges?.isError}
                            isLoading={incidentRelatedChanges?.isLoading}
                            items={incidentRelatedChanges?.data}
                            onRetry={incidentRelatedChanges.refetch}
                            isRefetching={incidentRelatedChanges.isRefetching}
                            error={incidentRelatedChanges?.error}
                            label="Related Changes"
                            height="15rem"
                            renderItem={(change) => (
                                <IncidentMetaDetailsCard
                                    key={change?.sys_id?.value}
                                    incidentId={change?.sys_id}
                                    incidentNumber={change?.number}
                                    priority={change?.priority}
                                    state={change?.state}
                                    shortDescription={change?.short_description}
                                    openedAt={change?.opened_at}
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
                    </ShellLayout.Body>
                </ShellLayout>
            </div>
        </div>
    );
};

export default IncidentFormAndTechAssistTab;
