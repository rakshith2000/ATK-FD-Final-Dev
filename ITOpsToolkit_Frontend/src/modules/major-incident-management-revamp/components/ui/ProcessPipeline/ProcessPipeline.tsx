import type React from 'react';
import { twMerge } from 'tailwind-merge';
import { Check } from 'lucide-react';

export type PipelineStepStatus = 'done' | 'active' | 'pending';

export interface PipelineStep {
    id: number;
    title: string;
    status: PipelineStepStatus;
}

export interface PipelinePhase {
    key: string;
    index: string;
    name: string;
    steps: PipelineStep[];
}

// .step — status drives left-border, background and the status dot / tag.
const stepStyles: Record<PipelineStepStatus, { card: string; dot: string; tag: string; label: string }> = {
    done: {
        card: 'border-l-[#0E7C4A] bg-white',
        dot: 'bg-[#0E7C4A] text-white',
        tag: 'bg-[#E6F4EC] text-[#0E7C4A] border-[#0E7C4A]/20',
        label: 'Complete',
    },
    active: {
        card: 'border-l-[#B26B00] bg-[#FFFDF8] shadow-[0_0_0_1px_rgba(178,107,0,0.18)]',
        dot: 'bg-[#B26B00] text-white animate-pulse',
        tag: 'bg-[#FDF3E2] text-[#B26B00] border-[#B26B00]/25',
        label: 'In progress',
    },
    pending: {
        card: 'border-l-[#C3CDDE] bg-[#FAFBFD] opacity-[0.86]',
        dot: 'border-[1.5px] border-dashed border-[#C3CDDE]',
        tag: 'bg-[#F0F2F6] text-[#4B5568] border-[#C3CDDE]',
        label: 'Not started',
    },
};

export interface ProcessPipelineProps {
    phases: PipelinePhase[];
    selectedStep: number;
    onSelectStep: (stepId: number) => void;
}

/**
 * The 4-phase process pipeline of the 7 MIM workflow steps — mirrors the `.pipeline`
 * region of the shared HTML mockup (phase bands, status-coloured step cards, legend).
 * Status/selection is driven entirely by props.
 */
const ProcessPipeline: React.FC<ProcessPipelineProps> = ({ phases, selectedStep, onSelectStep }) => {
    // Phase widths are proportional to their step count (mockup: 1fr 3fr 4fr 3fr),
    // so every step renders at the same width regardless of its phase.
    const phaseColumns = phases.map((p) => `${p.steps.length}fr`).join(' ');

    return (
        <section className="flex flex-col">
            <div className="flex items-baseline gap-3.5 flex-wrap mb-3">
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#12182B]">Major incident management process</h3>
                <span className="text-[12px] text-[#78839A]">7 steps across 4 phases · select any step for detail</span>
                <div className="ml-auto hidden sm:flex items-center gap-3.5 flex-wrap text-[11px] text-[#4B5568]">
                    <span className="flex items-center gap-1.5">
                        <i className="size-[9px] rounded-[2px] bg-[#0E7C4A]" />
                        Complete
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i className="size-[9px] rounded-[2px] bg-[#B26B00]" />
                        In progress
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i className="size-[9px] rounded-[2px] bg-[#C3CDDE]" />
                        Not started
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:[grid-template-columns:var(--phase-cols)]" style={{ '--phase-cols': phaseColumns } as React.CSSProperties}>
                {phases.map((phase) => (
                    <div key={phase.key} className="flex flex-col rounded-[7px] border border-[#DCE3EE] bg-white overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#E8EEFA] border-b border-[#DCE3EE]">
                            <span className="font-mono text-[10px] font-bold text-white bg-[#0033A0] rounded-[3px] px-[5px] py-[2px]">{phase.index}</span>
                            <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#001E4C]">{phase.name}</span>
                        </div>

                        <div
                            className="grid gap-2 p-[9px] flex-1 grid-cols-1 items-start xl:[grid-template-columns:var(--step-cols)]"
                            style={{ '--step-cols': `repeat(${phase.steps.length},minmax(0,1fr))` } as React.CSSProperties}
                        >
                            {phase.steps.map((step) => {
                                const s = stepStyles[step.status];
                                const isSelected = step.id === selectedStep;
                                return (
                                    <button
                                        key={step.id}
                                        type="button"
                                        onClick={() => onSelectStep(step.id)}
                                        aria-pressed={isSelected}
                                        className={twMerge(
                                            'text-left w-full rounded-[5px] border border-[#DCE3EE] border-l-[3px] px-2.5 py-[9px] flex flex-col gap-1.5 transition-all cursor-pointer hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(18,24,43,0.06),0_8px_24px_rgba(18,24,43,0.06)]',
                                            s.card,
                                            isSelected && 'border-[#0033A0] shadow-[0_0_0_2px_#E8EEFA]',
                                        )}
                                    >
                                        <div className="flex items-center gap-[7px]">
                                            <span className="font-mono text-[11px] font-bold text-[#78839A]">{String(step.id).padStart(2, '0')}</span>
                                            <span className={twMerge('ml-auto grid place-items-center size-[15px] rounded-full shrink-0', s.dot)}>
                                                {step.status === 'done' && <Check className="size-2.5" strokeWidth={3} />}
                                                {step.status === 'active' && <span className="size-1.5 rounded-full bg-white" />}
                                            </span>
                                        </div>
                                        <div className="text-[12.5px] font-semibold leading-[1.32] text-[#12182B]">{step.title}</div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={twMerge('text-[9.5px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[3px] border', s.tag)}>
                                                {s.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProcessPipeline;
