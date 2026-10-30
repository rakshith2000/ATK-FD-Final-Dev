import type React from 'react';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import type { PipelineStepStatus } from '../ProcessPipeline/ProcessPipeline';

export interface StepDetailPanelProps {
    stepId: number;
    title: string;
    phaseName: string;
    status: PipelineStepStatus;
    /** The reused stage-tab content for this step (data-connected, supplied by the smart layer). */
    children: ReactNode;
}

// .pill — status colours matching the mockup.
const statusPill: Record<PipelineStepStatus, { label: string; cls: string }> = {
    done: { label: 'Complete', cls: 'bg-[#E6F4EC] text-[#0E7C4A]' },
    active: { label: 'In progress', cls: 'bg-[#FDF3E2] text-[#B26B00]' },
    pending: { label: 'Not started', cls: 'bg-[#F0F2F6] text-[#4B5568]' },
};

/**
 * Presentational shell for the selected step's detail — mirrors the `.step-detail`
 * card of the mockup (rule border with a 3px brand-blue top edge). The body
 * (`children`) is a reused stage-tab from the existing MIM module, so the real
 * meeting/RCA/resolution/closure data renders unchanged inside the revamped styling.
 */
const StepDetailPanel: React.FC<StepDetailPanelProps> = ({ stepId, title, phaseName, status, children }) => {
    const pill = statusPill[status];
    return (
        <section className="flex flex-col min-h-0 flex-1 rounded-[6px] border border-[#DCE3EE] border-t-[3px] border-t-[#0033A0] bg-white overflow-hidden">
            <div className="flex items-center gap-3 flex-wrap px-[18px] py-3.5 border-b border-[#DCE3EE]">
                <span className={twMerge('text-[10.5px] font-bold uppercase tracking-[0.06em] px-2 py-[3px] rounded-[3px]', pill.cls)}>
                    Step {String(stepId).padStart(2, '0')} · {pill.label}
                </span>
                <h4 className="text-[15px] font-semibold text-[#12182B] tracking-[-0.01em]">{title}</h4>
                <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78839A]">{phaseName}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">{children}</div>
        </section>
    );
};

export default StepDetailPanel;
