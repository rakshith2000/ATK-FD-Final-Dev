import React, { useEffect, useMemo, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { Chart, ChartEvent, ActiveElement, ScriptableContext, TooltipItem, Plugin } from 'chart.js';
import { Triangle } from 'lucide-react';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import { ESCALATION_METRICS_SCHEMA } from '../../../services/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler);

interface AnalyticsChartsGridProps {
    series: { labels: string[]; raised: number[]; resolved: number[]; escalated: number[] };
    escalationBreakdown: Record<string, number>;
    escalationTotal: number;
    onEscalationItemClick: (type: string) => void;
}

const DEFAULT_FULL_YEAR_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const lineDataLabelsPlugin: Plugin<'line'> = {
    id: 'lineDataLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
                meta.data.forEach((element, index) => {
                    const dataValue = Array.isArray(dataset.data) ? dataset.data[index] : undefined;
                    const point = element.tooltipPosition(true);
                    if (point.x == null || point.y == null) return;
                    ctx.fillStyle = typeof dataset.borderColor === 'string' ? dataset.borderColor : '#333333';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(String(dataValue ?? ''), point.x, point.y - 4);
                });
            }
        });
        ctx.restore();
    },
};

function destroyExistingChart(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const existing = ChartJS.getChart(canvas);
    existing?.destroy();
}

export const AnalyticsChartsGrid: React.FC<AnalyticsChartsGridProps> = ({ series, escalationBreakdown = {}, escalationTotal, onEscalationItemClick }) => {
    const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const leftChartInstanceRef = useRef<Chart<'line'> | null>(null);
    const rightChartInstanceRef = useRef<Chart<'line'> | null>(null);

    const onEscalationItemClickRef = useRef(onEscalationItemClick);
    onEscalationItemClickRef.current = onEscalationItemClick;

    const activeLabels = useMemo(() => (series?.labels?.length > 0 ? series.labels : DEFAULT_FULL_YEAR_LABELS), [series]);
    const activeRaised = useMemo(() => activeLabels.map((_, i) => series?.raised?.[i] ?? 0), [activeLabels, series]);
    const activeResolved = useMemo(() => activeLabels.map((_, i) => series?.resolved?.[i] ?? 0), [activeLabels, series]);
    const activeEscalated = useMemo(() => activeLabels.map((_, i) => series?.escalated?.[i] ?? 0), [activeLabels, series]);

    const activeEscalationData = useMemo(
        () =>
            ESCALATION_METRICS_SCHEMA.map((item) => {
                const count = escalationBreakdown[item.key] || escalationBreakdown[item.display] || 0;
                return {
                    type: item.display,
                    backendKey: item.key,
                    count,
                };
            }),
        [escalationBreakdown],
    );

    const yAxisMax = useMemo(() => {
        const maxEscalationValue = Math.max(...activeEscalationData.map((d) => d.count), 5);
        return Math.ceil((maxEscalationValue * 1.2) / 5) * 5;
    }, [activeEscalationData]);

    useEffect(() => {
        const canvas = leftCanvasRef.current;
        if (!canvas) return;

        destroyExistingChart(canvas);

        const chart = new ChartJS(canvas, {
            type: 'line',
            data: {
                labels: activeLabels,
                datasets: [
                    {
                        label: 'Tickets Raised',
                        data: activeRaised,
                        borderColor: '#35CCD1',
                        backgroundColor: (context: ScriptableContext<'line'>) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                            gradient.addColorStop(0, 'rgba(53, 204, 209, 0.4)');
                            gradient.addColorStop(1, '#FFFFFF');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#35CCD1',
                    },
                    {
                        label: 'Tickets Resolved',
                        data: activeResolved,
                        borderColor: '#2A9619',
                        backgroundColor: (context: ScriptableContext<'line'>) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                            gradient.addColorStop(0, 'rgba(42, 150, 25, 0.4)');
                            gradient.addColorStop(1, '#FFFFFF');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#2A9619',
                    },
                    {
                        label: 'Tickets Escalated',
                        data: activeEscalated,
                        borderColor: '#773030',
                        backgroundColor: (context: ScriptableContext<'line'>) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                            gradient.addColorStop(0, 'rgba(119, 48, 48, 0.3)');
                            gradient.addColorStop(1, '#FFFAFA');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#773030',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top' as const,
                        labels: {
                            usePointStyle: true,
                            font: { size: 10, weight: 'bold' as const },
                            color: '#011a80',
                            padding: 10,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (context: TooltipItem<'line'>) => `${context.dataset.label}: ${context.parsed.y}`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#64748b', font: { size: 10 } },
                    },
                    x: {
                        ticks: {
                            color: '#78909C',
                            font: { size: 10 },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12,
                        },
                        grid: { display: false },
                    },
                },
            },
            plugins: [lineDataLabelsPlugin],
        });

        leftChartInstanceRef.current = chart;

        return () => {
            chart.destroy();
            if (leftChartInstanceRef.current === chart) {
                leftChartInstanceRef.current = null;
            }
        };
    }, [activeLabels, activeRaised, activeResolved, activeEscalated]);

    useEffect(() => {
        const canvas = rightCanvasRef.current;
        if (!canvas) return;

        destroyExistingChart(canvas);

        const chart = new ChartJS(canvas, {
            type: 'line',
            data: {
                labels: activeEscalationData.map((d) => d.type),
                datasets: [
                    {
                        label: 'Escalations',
                        data: activeEscalationData.map((d) => d.count),
                        fill: true,
                        backgroundColor: (context: ScriptableContext<'line'>) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                            gradient.addColorStop(0, 'rgba(53, 204, 209, 0.55)');
                            gradient.addColorStop(1, '#FFFFFF');
                            return gradient;
                        },
                        borderColor: '#35CCD1',
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#011A80',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (_evt: ChartEvent, element: ActiveElement[]) => {
                    if (element.length > 0) {
                        const index = element[0].index;
                        const selectedItem = activeEscalationData[index];
                        onEscalationItemClickRef.current(selectedItem.backendKey);
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context: TooltipItem<'line'>) => `${context.label}: ${context.parsed.y}`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yAxisMax,
                        ticks: {
                            stepSize: Math.ceil(yAxisMax / 5),
                            color: '#78909C',
                            font: { size: 10 },
                        },
                        grid: { display: true, color: '#f0f0f0' },
                    },
                    x: { display: false },
                },
            },
        });

        rightChartInstanceRef.current = chart;

        return () => {
            chart.destroy();
            if (rightChartInstanceRef.current === chart) {
                rightChartInstanceRef.current = null;
            }
        };
    }, [activeEscalationData, yAxisMax]);

    return (
        <div className="w-full flex flex-col lg:flex-row items-stretch justify-between gap-4 mb-4">
            <div className="w-full lg:max-w-[48.5%] flex flex-col">
                <div className="w-full flex mb-2">
                    <TitleWithArraow
                        title="Overall Tickets Analysis Status"
                        showArrow={true}
                        className="p-0 text-base font-extrabold pb-0.5 tracking-wide text-(--brand-title-primary-color) [--ticket-title-color:var(--brand-title-primary-color)] [--change-arrow-color-itsm:var(--brand-title-primary-color)]"
                    />
                </div>

                <div className="w-full bg-white border border-slate-200 rounded-[16px] p-3 shadow-xs [box-shadow:inset_0_2px_8px_0_#abc2ff]">
                    <div className="h-57.5 w-full relative">
                        <canvas ref={leftCanvasRef} />
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex items-center justify-center w-auto">
                <div className="h-[85%] border-r-2 border-dashed border-blue-200/60" />
            </div>

            <div className="w-full lg:max-w-[48.5%] flex flex-col">
                <div className="w-full flex mb-2">
                    <TitleWithArraow
                        title="Issues for escalation"
                        showArrow={true}
                        className="p-0 text-base font-extrabold pb-0.5 tracking-wide text-(--brand-title-primary-color) [--ticket-title-color:var(--brand-title-primary-color)] [--change-arrow-color-itsm:var(--brand-title-primary-color)]"
                    />
                </div>

                <div className="w-full bg-white border border-slate-200 rounded-[16px] p-3 shadow-xs relative flex flex-row items-stretch gap-2 [box-shadow:inset_0_2px_8px_0_#abc2ff]">
                    <div className="flex-1 h-57.5 relative">
                        <canvas ref={rightCanvasRef} />
                    </div>

                    <div className="w-32.5 flex flex-col justify-center gap-2 pl-2 border-l border-slate-100 select-none shrink-0">
                        {activeEscalationData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 max-w-full cursor-pointer hover:opacity-80" onClick={() => onEscalationItemClick(item.backendKey)}>
                                <div className="w-2 h-2 bg-[#011A80] shrink-0 rounded-xs" />
                                <span className="text-[9px] font-bold text-slate-600 truncate" title={item.type}>
                                    {item.type} - {item.count}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="absolute top-3 right-35 flex items-center justify-center select-none bg-[#EAF5FF] border border-[#A4D1FF]/60 border-dashed px-2.5 py-1.5 rounded-[10px] shadow-xs gap-2 z-20">
                        <span className="text-xl font-bold text-[#011A80] leading-none tracking-tight">{escalationTotal}</span>
                        <Triangle className="w-2 h-2 text-[#3B62CC] fill-[#3B62CC]" />
                    </div>

                    <div className="absolute bottom-1 left-3 w-[calc(100%-145px)] text-center text-slate-400 text-[9px] font-semibold italic pointer-events-none select-none">
                        *Click on any issue to check the detailed analysis
                    </div>
                </div>
            </div>
        </div>
    );
};
