import { Stepper, StepperContent, StepperIndicator, StepperItem, StepperNav, StepperPanel, StepperSeparator, StepperTrigger } from '@/shadcn/components/reui/stepper';
import { useScrollOverflow } from '@/shared/hooks/useScrollOverflow';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';

import React, { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';
import calculateIncidentCompletedTillStep from '@/modules/major-incident-management/utils/calculate-inc-completed-till-step';
import getIncidentSteps from '@/modules/major-incident-management/utils/get-inc-steps';
import IncidentFormAndTechAssistTab from '../../smart/StageTabs/IncidentFormAndTechAssistTab';
import IncidentAcknowledgementTab from '../../smart/StageTabs/IncidentAcknowledgementTab';
import IncidentScheduleMeetingTab from '../../smart/StageTabs/IncidentScheduleMeetingTab';
import IncidentMeetingSummaryTab from '../../smart/StageTabs/IncidentMeetingSummaryTab';
import IncidentRcaTab from '../../smart/StageTabs/IncidentRcaTab';
import IncidentStepsTakenTab from '../../smart/StageTabs/IncidentStepsTakenTab';
import IncidentOpenVsResolvedTab from '../../smart/StageTabs/IncidentOpenVsResolvedTab';

export const IncidentProgress: React.FC<{
    incidentNumber: string;
    snowIncident: SnowTicket;
    incidentMimDetails: MimDataResponse;
    reloadQeries: () => void;
}> = ({ incidentMimDetails, incidentNumber, snowIncident, reloadQeries }) => {
    const dynamicSteps = getIncidentSteps({ mimData: incidentMimDetails, snowIncident: snowIncident });
    const completedTillStep = calculateIncidentCompletedTillStep({ mimData: incidentMimDetails, snowIncident: snowIncident });

    const initialSelectedStep = Math.min(completedTillStep + 1, dynamicSteps.length);

    const [selectedStep, setSelectedStep] = useState<number>(initialSelectedStep);

    const selectedItemRef = useRef<HTMLDivElement | null>(null);

    const { scrollContainerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useScrollOverflow<HTMLDivElement>({
        direction: 'horizontal',
        scrollDistance: 240,
    });

    // Sync selected step on initial data load or when completed steps update
    useEffect(() => {
        setSelectedStep(initialSelectedStep);
    }, [initialSelectedStep]);

    // Auto-scroll active/selected stage card into view on mount and step change if out of view
    useEffect(() => {
        const timer = setTimeout(() => {
            const el = selectedItemRef.current;
            const container = scrollContainerRef.current;

            if (el && container) {
                const elRect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                const isOutOfViewLeft = elRect.left < containerRect.left;
                const isOutOfViewRight = elRect.right > containerRect.right;

                if (isOutOfViewLeft || isOutOfViewRight) {
                    el.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center',
                    });
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [selectedStep]);

    return (
        <div className={`w-full max-w-full h-[calc(100dvh-6.125rem)] flex flex-col gap-2.5 p-1 overflow-hidden`}>
            <Stepper
                className="w-full max-w-full flex-1 flex flex-col min-h-0 overflow-hidden gap-1.5"
                completedTillStep={completedTillStep}
                value={selectedStep}
                onValueChange={setSelectedStep}
            >
                {/* Fixed Top Stepper Cards Header */}
                <div className="flex items-center gap-2 w-full max-w-full relative shrink-0">
                    <button
                        type="button"
                        onClick={() => scrollLeft()}
                        className={twMerge(
                            'shrink-0 absolute! left-0 cursor-pointer btn-split split-blue-light shadow-xs p-1.5 rounded-full z-20 transition-opacity',
                            !canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-100',
                        )}
                        aria-label="Scroll Left"
                    >
                        <span>
                            <FaChevronLeft className="size-3" />
                        </span>
                    </button>

                    <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar flex-1 pb-1 pt-1">
                        <StepperNav className="gap-3.5 min-w-max items-stretch px-3 py-1 pb-2">
                            {dynamicSteps.map((step, index) => {
                                const stepNum = index + 1;
                                const isCompleted = index < completedTillStep;
                                const isActive = stepNum === completedTillStep + 1;
                                const isSelected = stepNum === selectedStep;
                                const isDisabled = index > completedTillStep;

                                return (
                                    <StepperItem
                                        key={index}
                                        ref={isSelected ? selectedItemRef : null}
                                        step={stepNum}
                                        completed={isCompleted}
                                        disabled={isDisabled}
                                        className="relative flex-1 items-stretch min-w-42.5 sm:min-w-48.75"
                                    >
                                        <StepperTrigger className="relative z-10 flex grow flex-col items-start justify-start gap-1.5 w-full h-full">
                                            <StepperIndicator className="size-7 border-2 shrink-0">{step.icon}</StepperIndicator>

                                            <div
                                                className={`relative flex flex-col justify-start items-start p-2 rounded-lg border w-full h-full text-left gap-1.5 transition-all duration-200 ${
                                                    isCompleted
                                                        ? 'border-blue-300 ring-blue-300/40 bg-blue-100/30 hover:border-blue-400'
                                                        : isActive
                                                          ? 'border-emerald-400 bg-emerald-100/30 ring-2 ring-emerald-300/40'
                                                          : 'border-slate-400 bg-slate-100/40'
                                                } ${isSelected ? 'scale-105 ring-2 ring-offset-0.5 translate-y-0.5 translate-x-0.5' : ''}`}
                                            >
                                                <span
                                                    className={`text-[0.6875rem] font-bold truncate w-full ${
                                                        isCompleted ? 'text-blue-900' : isActive ? 'text-emerald-700' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {step.title}
                                                </span>

                                                <div className="text-[0.625rem] text-muted-foreground line-clamp-2 w-full leading-tight font-medium">{step.body}</div>

                                                {isSelected && (
                                                    <div
                                                        className={`absolute left-1/2 -bottom-1.75 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent ${
                                                            isCompleted ? 'border-t-blue-300' : isActive ? 'border-t-emerald-400' : 'border-t-slate-400'
                                                        }`}
                                                    />
                                                )}
                                            </div>
                                        </StepperTrigger>

                                        {dynamicSteps.length > index + 1 && (
                                            <StepperSeparator className="group-data-[state=completed]/step:bg-success absolute inset-x-0 inset-s-8 top-3.5 m-0 z-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-1.75rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none" />
                                        )}
                                    </StepperItem>
                                );
                            })}
                        </StepperNav>
                    </div>

                    <button
                        type="button"
                        onClick={() => scrollRight()}
                        className={twMerge(
                            'shrink-0 absolute! right-0 cursor-pointer btn-split split-blue-light shadow-xs p-1.5 rounded-full z-20 transition-opacity',
                            !canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-100',
                        )}
                        aria-label="Scroll Right"
                    >
                        <span>
                            <FaChevronRight className="size-3" />
                        </span>
                    </button>
                </div>

                <StepperPanel
                    className="text-sm w-full max-w-full flex-1 min-h-0 overflow-hidden
                "
                >
                    <StepperContent value={1} className="w-full max-w-full h-full min-h-0 overflow-hidden">
                        <IncidentFormAndTechAssistTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>

                    <StepperContent value={2} className="w-full max-w-full h-full min-h-0 overflow-auto">
                        <IncidentAcknowledgementTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>

                    <StepperContent value={3} className="w-full max-w-full h-full min-h-0 overflow-auto">
                        <IncidentScheduleMeetingTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>

                    <StepperContent value={4} className="w-full max-w-full h-full min-h-0 overflow-auto">
                        <IncidentMeetingSummaryTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>

                    <StepperContent value={5} className="w-full max-w-full h-full min-h-0 overflow-auto">
                        <IncidentRcaTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>

                    <StepperContent value={6} className="w-full max-w-full h-full min-h-0 overflow-auto">
                        <IncidentStepsTakenTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>

                    <StepperContent value={7} className="w-full max-w-full h-full min-h-0 overflow-auto">
                        <IncidentOpenVsResolvedTab incidentNumber={incidentNumber} mimData={incidentMimDetails} reloadQueries={reloadQeries} snowIncident={snowIncident} />
                    </StepperContent>
                </StepperPanel>
            </Stepper>
        </div>
    );
};

export default IncidentProgress;
