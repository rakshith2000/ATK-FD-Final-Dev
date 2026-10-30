import React, { useEffect, useMemo, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import type { Chart } from 'chart.js';

ChartJS.register(...registerables);

interface DistributionChartProps {
    stats: {
        active: number;
        resolved: number;
        escalated: number;
    };
    filterStatus: string;
}

function destroyExistingChart(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const existing = ChartJS.getChart(canvas);
    existing?.destroy();
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ stats, filterStatus }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart<'bar'> | null>(null);

    const chartData = useMemo(
        () => ({
            labels: ['Active', 'Resolved', 'Escalated'],
            datasets: [
                {
                    label: 'Ticket Count',
                    data: [stats.active, stats.resolved, stats.escalated],
                    backgroundColor: [
                        filterStatus === 'active' || filterStatus === 'all' ? '#4FC3F7' : '#CBD5E1',
                        filterStatus === 'resolved' || filterStatus === 'all' ? '#81C784' : '#CBD5E1',
                        filterStatus === 'escalated' || filterStatus === 'all' ? '#9FA8DA' : '#CBD5E1',
                    ],
                    borderRadius: 8,
                    maxBarThickness: 45,
                },
            ],
        }),
        [stats.active, stats.resolved, stats.escalated, filterStatus],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        destroyExistingChart(canvas);

        const chart = new ChartJS(canvas, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.04)' } },
                    x: { grid: { display: false } },
                },
            },
        });

        chartInstanceRef.current = chart;

        return () => {
            chart.destroy();
            if (chartInstanceRef.current === chart) {
                chartInstanceRef.current = null;
            }
        };
    }, [chartData]);

    return (
        <div className="w-full bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm shrink-0 [box-shadow:inset_0_2px_10px_0_#abc2ff]">
            <div className="flex items-center justify-between mb-4">
                <h6 className="text-xs font-bold text-[#011A80] uppercase tracking-wide">Status Distribution Model</h6>
            </div>
            <div className="h-55 relative w-full">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
};
