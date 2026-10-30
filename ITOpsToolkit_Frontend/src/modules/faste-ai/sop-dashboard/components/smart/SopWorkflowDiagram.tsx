import { useMemo, useEffect } from 'react';
import { ReactFlow, Background, Controls, MarkerType, Position, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface WorkflowItem {
    step: string;
    action?: string;
    if_yes?: string;
    if_no?: string;
    [key: string]: unknown;
}

interface SOPWorkflowDiagramProps {
    workflowData: WorkflowItem[];
}

function FlowContent({ workflowData }: SOPWorkflowDiagramProps) {
    const { fitView } = useReactFlow();

    const { nodes, edges } = useMemo(() => {
        if (!workflowData || workflowData.length === 0) return { nodes: [], edges: [] };

        const COL_W = 340;
        const ROW_H = 160;

        const stepByKey = new Map(workflowData.map((w) => [String(w.step).trim().toLowerCase(), w.step]));
        const itemByStep = new Map(workflowData.map((w) => [w.step, w]));

        const cleanText = (value: unknown) =>
            String(value || '')
                .replace(/\s+/g, ' ')
                .trim();

        const toSentence = (value: unknown, fallback = '') => {
            const text = cleanText(value) || fallback;
            if (!text) return '';
            const first = text.charAt(0).toUpperCase() + text.slice(1);
            return /[.!?]$/.test(first) ? first : `${first}.`;
        };

        const nodeTitle = (id: string) => {
            if (id === '__END__') return 'Workflow Completion';
            if (id === '__ESC__') return 'Escalation and Ownership Handoff';
            return cleanText(id) || 'Current Step';
        };

        const isEscalationStep = (item?: WorkflowItem) => {
            const txt = `${item?.step || ''} ${item?.action || ''}`.toLowerCase();
            return /escalat|hand[\s-]?off|assign to|l2|l3|on[\s-]?call|support team/.test(txt);
        };

        const resolveTarget = (raw?: string) => {
            if (!raw || !String(raw).trim()) return null;
            const key = String(raw).trim().toLowerCase();
            if (stepByKey.has(key)) return stepByKey.get(key);
            if (key === 'end' || key.startsWith('end') || key.includes('complete')) return '__END__';
            if (key.includes('escal')) return '__ESC__';

            let best: string | null = null;
            workflowData.forEach((w) => {
                const s = String(w.step).trim().toLowerCase();
                if (key.includes(s) && (!best || s.length > best.length)) best = s;
            });
            if (best) return stepByKey.get(best) || '__END__';
            return '__END__';
        };

        const branchNarrative = (targetId: string | null, isYesPath: boolean) => {
            const decisionText = isYesPath
                ? 'When all validation checks pass and acceptance criteria are met'
                : 'When validation fails, risk is detected, or required data is missing';

            if (!targetId) {
                return isYesPath
                    ? `${decisionText}, continue with the next operational checkpoint.`
                    : `${decisionText}, hold progression and perform remediation before proceeding.`;
            }

            if (targetId === '__END__') {
                return isYesPath
                    ? `${decisionText}, close the workflow and capture final completion evidence.`
                    : `${decisionText}, end the current attempt and document the unresolved outcome.`;
            }

            if (targetId === '__ESC__') {
                return `${decisionText}, escalate to the designated support owner using the escalation matrix and handoff protocol.`;
            }

            const targetName = nodeTitle(targetId);
            return `${decisionText}, proceed to ${targetName} and transfer all context, logs, and decision notes.`;
        };

        const rawEdges: Array<{ source: string; target: string; kind: 'yes' | 'no' }> = [];
        workflowData.forEach((item) => {
            const yes = resolveTarget(item.if_yes);
            const no = resolveTarget(item.if_no);
            if (yes) rawEdges.push({ source: item.step, target: yes, kind: 'yes' });
            if (no && no !== yes) rawEdges.push({ source: item.step, target: no, kind: 'no' });
        });

        const nodeIds = workflowData.map((w) => w.step);
        const referenced = new Set(rawEdges.map((e) => e.target));
        if (referenced.has('__END__')) nodeIds.push('__END__');
        if (referenced.has('__ESC__')) nodeIds.push('__ESC__');

        const preds: Record<string, string[]> = {};
        nodeIds.forEach((id) => {
            preds[id] = [];
        });
        rawEdges.forEach((e) => {
            if (preds[e.target]) preds[e.target].push(e.source);
        });

        const layer: Record<string, number> = {};
        const computeLayer = (id: string, seen: Set<string>): number => {
            if (layer[id] != null) return layer[id];
            if (seen.has(id)) return 0;
            seen.add(id);
            let l = 0;
            (preds[id] || []).forEach((p) => {
                l = Math.max(l, computeLayer(p, seen) + 1);
            });
            seen.delete(id);
            layer[id] = l;
            return l;
        };
        nodeIds.forEach((id) => computeLayer(id, new Set()));

        const onSpine = new Set<string>();
        let cur = workflowData[0]?.step;
        const guard = new Set<string>();
        while (cur && !guard.has(cur)) {
            guard.add(cur);
            onSpine.add(cur);
            const nxt = resolveTarget(itemByStep.get(cur)?.if_yes);
            if (!nxt || nxt === '__ESC__') break;
            onSpine.add(nxt);
            if (nxt === '__END__' || !itemByStep.has(nxt)) break;
            cur = nxt;
        }
        onSpine.add('__END__');

        const maxLayer = nodeIds.reduce((m, id) => Math.max(m, layer[id] || 0), 0);
        if (layer['__END__'] != null) layer['__END__'] = maxLayer + 1;

        const col: Record<string, number> = {};
        const perLayerRight: Record<number, number> = {};
        nodeIds.forEach((id) => {
            if (onSpine.has(id)) {
                col[id] = 0;
                return;
            }
            const l = layer[id] || 0;
            perLayerRight[l] = perLayerRight[l] || 0;
            col[id] = 1 + perLayerRight[l];
            perLayerRight[l] += 1;
        });

        const genNodes: Node[] = [];
        const genEdges: Edge[] = [];
        const baseCard = { borderRadius: 10, boxShadow: '0 4px 12px rgba(15,23,42,0.10)' };

        nodeIds.forEach((id) => {
            const x = (col[id] || 0) * COL_W;
            const y = (layer[id] || 0) * ROW_H;

            if (id === '__END__') {
                const fullText =
                    'All required workflow steps are complete. Archive outputs, update the ticket or SOP record, and confirm the final status for audit and reporting.';
                genNodes.push({
                    id,
                    position: { x, y },
                    targetPosition: Position.Top,
                    sourcePosition: Position.Bottom,
                    data: {
                        label: (
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>Workflow Completion</div>
                                <div style={{ fontSize: 12, color: '#14532d', lineHeight: 1.35 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={fullText}>
                                        {fullText}
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                    style: { ...baseCard, width: 300, background: '#dcfce7', border: '2px solid #16a34a', padding: 10 },
                });
            } else if (id === '__ESC__') {
                const fullText =
                    'Transfer ownership to the designated support tier with full incident context, evidence, troubleshooting actions, and urgency level, following the approved escalation matrix.';
                genNodes.push({
                    id,
                    position: { x, y },
                    targetPosition: Position.Top,
                    sourcePosition: Position.Bottom,
                    data: {
                        label: (
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Escalation and Ownership Handoff</div>
                                <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.35 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={fullText}>
                                        {fullText}
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                    style: { ...baseCard, width: 300, background: '#fee2e2', border: '2px solid #dc2626', padding: 10 },
                });
            } else {
                const item = itemByStep.get(id) || ({} as WorkflowItem);
                const esc = isEscalationStep(item);
                const actionText = toSentence(item.action, `Execute ${nodeTitle(item.step)} using the approved SOP controls and document the result.`);
                const yesTarget = resolveTarget(item.if_yes);
                const noTarget = resolveTarget(item.if_no);
                const yesText = branchNarrative(yesTarget ?? null, true);
                const noText = branchNarrative(noTarget ?? null, false);

                const expectedOutcome =
                    yesTarget === '__END__'
                        ? 'This step should produce a final, reviewable output that satisfies closure criteria.'
                        : 'This step should produce validated output and complete context required by the next step.';

                const fullText = [
                    `Action: ${actionText}`,
                    `Success Path (Yes): ${yesText}`,
                    item.if_no ? `Failure Path (No): ${noText}` : '',
                    `Expected Outcome: ${expectedOutcome}`,
                ]
                    .filter(Boolean)
                    .join('\n');

                const previewText = cleanText(`${actionText} ${expectedOutcome}`);

                genNodes.push({
                    id,
                    position: { x, y },
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top,
                    data: {
                        label: (
                            <div style={{ padding: 4, textAlign: 'left' }}>
                                <div
                                    style={{
                                        fontWeight: 700,
                                        borderBottom: `1px solid ${esc ? '#fecaca' : '#e2e8f0'}`,
                                        paddingBottom: 6,
                                        marginBottom: 6,
                                        color: esc ? '#991b1b' : '#1e3c72',
                                    }}
                                >
                                    {nodeTitle(item.step)}
                                </div>
                                <div style={{ fontSize: 12, color: esc ? '#7f1d1d' : '#334155', lineHeight: 1.35 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={fullText}>
                                        {previewText}
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                    style: {
                        ...baseCard,
                        width: 300,
                        background: esc ? '#fef2f2' : '#fff',
                        border: `2px solid ${esc ? '#dc2626' : '#94a3b8'}`,
                    },
                });
            }
        });

        rawEdges.forEach((e, i) => {
            const isYes = e.kind === 'yes';
            const stroke = isYes ? '#16a34a' : '#dc2626';
            genEdges.push({
                id: `e-${i}`,
                source: e.source,
                target: e.target,
                label: isYes ? 'Yes' : 'No',
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 18, height: 18 },
                style: { stroke, strokeWidth: 2 },
                labelStyle: { fill: stroke, fontWeight: 700, fontSize: 11 },
                labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
                labelBgPadding: [5, 2],
                labelBgBorderRadius: 4,
            });
        });

        return { nodes: genNodes, edges: genEdges };
    }, [workflowData]);

    useEffect(() => {
        if (nodes.length > 0) {
            const timer = setTimeout(() => {
                fitView({ padding: 0.25 });
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [nodes, fitView]);

    if (!workflowData || workflowData.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-gray-500 py-12">
                <h5 className="text-sm font-semibold">No diagram available.</h5>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-125 relative bg-slate-50 flex-1">
            <style>{'.react-flow__attribution{display:none!important}.react-flow__attribution a{display:none!important}'}</style>
            <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.2} nodesConnectable={false} proOptions={{ hideAttribution: true }}>
                <Background color="#cbd5e1" gap={16} size={1} />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export default function SOPWorkflowDiagram(props: SOPWorkflowDiagramProps) {
    return (
        <ReactFlowProvider>
            <FlowContent {...props} />
        </ReactFlowProvider>
    );
}
