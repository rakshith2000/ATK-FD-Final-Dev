import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import { getSnowFieldDisplayValue, getSnowFieldValue, getSnowFieldValueOrDisplay } from '@/shared/modules/servicenow/utils/servicenow-field-helpers';
import { formatLocalDate } from '@/shared/utils/format-local-date';
import getServiceNowLink from '@/shared/modules/servicenow/utils/get-service-now-link';

import getIncidentSteps from '@/modules/major-incident-management/utils/get-inc-steps';
import calculateIncidentCompletedTillStep from '@/modules/major-incident-management/utils/calculate-inc-completed-till-step';
import { getMimIncidentDetails } from '@/modules/major-incident-management/utils/get-mim-incident-details';

import IncidentFormAndTechAssistTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentFormAndTechAssistTab';
import IncidentAcknowledgementTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentAcknowledgementTab';
import IncidentScheduleMeetingTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentScheduleMeetingTab';
import IncidentMeetingSummaryTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentMeetingSummaryTab';
import IncidentRcaTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentRcaTab';
import IncidentStepsTakenTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentStepsTakenTab';
import IncidentOpenVsResolvedTab from '@/modules/major-incident-management/components/smart/StageTabs/IncidentOpenVsResolvedTab';

import IncidentCommandStrip from '../../ui/IncidentCommandStrip/IncidentCommandStrip';
import type { IncidentTile } from '../../ui/IncidentTiles/IncidentTiles';
import ProcessPipeline, { type PipelinePhase, type PipelineStepStatus } from '../../ui/ProcessPipeline/ProcessPipeline';
import StepDetailPanel from '../../ui/StepDetailPanel/StepDetailPanel';
import { MIM_PHASES } from '../../../utils/get-mim-phases';
import { formatDurationMs, getElapsedMs } from '../../../utils/format-duration';

export interface IncidentAnalysisRevampProps {
    incidentNumber: string;
    snowIncident: SnowTicket;
    incidentMimDetails: MimDataResponse;
    reload: () => void;
    isRefreshing: boolean;
}

const stepStatusFor = (stepId: number, completedTillStep: number): PipelineStepStatus => {
    if (stepId <= completedTillStep) return 'done';
    if (stepId === completedTillStep + 1) return 'active';
    return 'pending';
};

const IncidentAnalysisRevamp: React.FC<IncidentAnalysisRevampProps> = ({ incidentNumber, snowIncident, incidentMimDetails, reload, isRefreshing }) => {
    const steps = useMemo(() => getIncidentSteps({ mimData: incidentMimDetails, snowIncident }), [incidentMimDetails, snowIncident]);
    const completedTillStep = useMemo(() => calculateIncidentCompletedTillStep({ mimData: incidentMimDetails, snowIncident }), [incidentMimDetails, snowIncident]);

    const currentStepId = Math.min(completedTillStep + 1, steps.length);

    const [selectedStep, setSelectedStep] = useState<number>(currentStepId);

    // Keep the selected step in sync with the derived current step when data changes.
    useEffect(() => {
        setSelectedStep(currentStepId);
    }, [currentStepId]);

    const incDetails = getMimIncidentDetails(incidentMimDetails);

    // ── Derived incident fields (ServiceNow first, MIM details as fallback) ──
    const priorityValue = getSnowFieldValue(snowIncident?.priority) || '';
    const priorityLabel = getSnowFieldDisplayValue(snowIncident?.priority, priorityValue ? `P${priorityValue}` : '—');
    const stateLabel = getSnowFieldDisplayValue(snowIncident?.state, incDetails?.state || '—');
    const category = getSnowFieldValueOrDisplay(snowIncident?.category) || incDetails?.category || '—';
    const shortDescription = getSnowFieldDisplayValue(snowIncident?.short_description, incDetails?.short_description || '');
    const assignedTo = getSnowFieldValueOrDisplay(snowIncident?.assigned_to) || incDetails?.assigned_to || 'Unassigned';
    const assignmentGroup = getSnowFieldValueOrDisplay(snowIncident?.assignment_group) || incDetails?.assignment_group || '—';

    const openedAtRaw = getSnowFieldValueOrDisplay(snowIncident?.opened_at) || getSnowFieldValueOrDisplay(snowIncident?.sys_created_on) || incDetails?.sys_created_on || '';
    const resolvedAtRaw = getSnowFieldValueOrDisplay(snowIncident?.resolved_at) || getSnowFieldValueOrDisplay(snowIncident?.closed_at) || '';
    const isResolved = Boolean(resolvedAtRaw);

    // ── Live elapsed clock (frozen at the resolved duration once resolved) ──
    const [now, setNow] = useState<number>(() => Date.now());
    useEffect(() => {
        if (isResolved) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [isResolved]);

    const elapsedMs = getElapsedMs(openedAtRaw, resolvedAtRaw || null, now);

    const currentStepName = steps[currentStepId - 1]?.title ?? '';

    // ── Command-strip tiles ──
    const tiles: IncidentTile[] = [
        { k: 'State', v: stateLabel },
        { k: 'Assigned To', v: assignedTo },
        { k: 'Assignment Group', v: assignmentGroup },
        { k: 'Current Step', v: `Step ${currentStepId} of ${steps.length}`, sub: currentStepName, mono: true },
        { k: 'Duration', v: formatDurationMs(elapsedMs), sub: isResolved ? 'Open → resolved' : 'Elapsed (open)', mono: true },
    ];

    const metaItems = [
        `Category: ${category}`,
        ...(openedAtRaw ? [`Opened ${formatLocalDate(openedAtRaw) ?? openedAtRaw}`] : []),
        ...(isResolved ? [`Resolved ${formatLocalDate(resolvedAtRaw) ?? resolvedAtRaw}`] : []),
    ];

    // ── Pipeline phases (7 steps grouped into 4 phases) ──
    const phases: PipelinePhase[] = MIM_PHASES.map((phase) => ({
        key: phase.key,
        index: phase.index,
        name: phase.name,
        steps: phase.stepIds.map((id) => {
            const stepMeta = steps[id - 1];
            return {
                id,
                title: stepMeta?.title ?? `Step ${id}`,
                status: stepStatusFor(id, completedTillStep),
            };
        }),
    }));

    const selectedPhase = MIM_PHASES.find((p) => p.stepIds.includes(selectedStep));
    const selectedStepMeta = steps[selectedStep - 1];

    const serviceNowLink = getServiceNowLink({ sysId: getSnowFieldValue(snowIncident?.sys_id) || '', type: 'incident' });

    const stageTabProps = { incidentNumber, mimData: incidentMimDetails, snowIncident, reloadQueries: reload };

    const renderStageTab = () => {
        switch (selectedStep) {
            case 1:
                return <IncidentFormAndTechAssistTab {...stageTabProps} />;
            case 2:
                return <IncidentAcknowledgementTab {...stageTabProps} />;
            case 3:
                return <IncidentScheduleMeetingTab {...stageTabProps} />;
            case 4:
                return <IncidentMeetingSummaryTab {...stageTabProps} />;
            case 5:
                return <IncidentRcaTab {...stageTabProps} />;
            case 6:
                return <IncidentStepsTakenTab {...stageTabProps} />;
            case 7:
                return <IncidentOpenVsResolvedTab {...stageTabProps} />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full flex flex-col overflow-y-auto bg-[#F4F6FA]">
            <IncidentCommandStrip
                priorityValue={priorityValue}
                priorityLabel={priorityLabel}
                title={shortDescription}
                incidentId={incidentNumber}
                statusLabel={stateLabel}
                metaItems={metaItems}
                tiles={tiles}
                serviceNowLink={serviceNowLink}
                isRefreshing={isRefreshing}
                onRefresh={reload}
            />

            <div className="px-6 py-6 flex flex-col gap-6">
                <ProcessPipeline phases={phases} selectedStep={selectedStep} onSelectStep={setSelectedStep} />

                <div className="flex flex-col h-[80vh]">
                    <StepDetailPanel
                        stepId={selectedStep}
                        title={selectedStepMeta?.title ?? `Step ${selectedStep}`}
                        phaseName={selectedPhase?.name ?? ''}
                        status={stepStatusFor(selectedStep, completedTillStep)}
                    >
                        {renderStageTab()}
                    </StepDetailPanel>
                </div>
            </div>
        </div>
    );
};

export default IncidentAnalysisRevamp;
