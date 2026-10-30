import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, BarController, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { Chart } from 'chart.js';
import { KpiMetricsGrid } from '../components/ui/MetricCards/KpiMetricsGrid';
import { TicketTable } from '../components/smart/TicketTable/TicketTable';
import type { Ticket } from '../components/smart/TicketTable/TicketTable';

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, BarController, Title, Tooltip, Legend, Filler);

interface CategoryData {
    title: string;
    measures: string[];
    ticketsByCategory?: Record<string, Ticket[]>;
    stats?: {
        raised: number;
        resolved: number;
        escalated: number;
        active?: number;
        breakdown?: Record<string, number>;
    };
}

interface LocationState {
    category: CategoryData;
    allTickets: Ticket[];
    initialFilter?: string;
}

function destroyExistingChart(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const existing = ChartJS.getChart(canvas);
    existing?.destroy();
}

export const ATECategoryAnalysis: React.FC = () => {
    const location = useLocation();

    const { category, allTickets, initialFilter } = (location.state as unknown as LocationState) || {};

    const [filterStatus, setFilterStatus] = useState<string>(initialFilter || 'all');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart<'bar'> | null>(null);

    const safeTickets = useMemo(() => allTickets || [], [allTickets]);
    const stats = useMemo(() => {
        const totalFallback = safeTickets.length;
        const resolvedFallback = safeTickets.filter((t) => String(t.resolved).toLowerCase() === 'true' || t.resolved === true).length;
        const escalatedFallback = safeTickets.filter((t) => String(t.escalation_state).toLowerCase() === 'true' || t.escalation_state === true).length;

        const total = category?.stats?.raised ?? totalFallback;
        const resolved = category?.stats?.resolved ?? resolvedFallback;
        const escalated = category?.stats?.escalated ?? escalatedFallback;
        const active = category?.stats?.active ?? total - resolved;

        return { total, resolved, escalated, active };
    }, [category, safeTickets]);

    const subCategoryChartData = useMemo(() => {
        if (!safeTickets.length) return { labels: [], datasets: [] };

        const groupMap: Record<string, Ticket[]> = {};
        safeTickets.forEach((t) => {
            const cat = t.ticket_category || 'General';
            if (!groupMap[cat]) groupMap[cat] = [];
            groupMap[cat].push(t);
        });

        const labels = Object.keys(groupMap);

        const getTotal = (tickets: Ticket[]) => tickets.length;
        const getResolved = (tickets: Ticket[]) => tickets.filter((t) => String(t.resolved).toLowerCase() === 'true' || t.resolved === true).length;
        const getEscalated = (tickets: Ticket[]) => tickets.filter((t) => String(t.escalation_state).toLowerCase() === 'true' || t.escalation_state === true).length;
        const getActive = (tickets: Ticket[]) => tickets.filter((t) => !(String(t.resolved).toLowerCase() === 'true' || t.resolved === true)).length;

        const allDatasets = [
            {
                id: 'all',
                label: 'Total',
                data: labels.map((l) => getTotal(groupMap[l])),
                backgroundColor: '#4FC3F7',
                borderRadius: 4,
                maxBarThickness: 40,
            },
            {
                id: 'resolved',
                label: 'Resolved',
                data: labels.map((l) => getResolved(groupMap[l])),
                backgroundColor: '#81C784',
                borderRadius: 4,
                maxBarThickness: 40,
            },
            {
                id: 'escalated',
                label: 'Escalated',
                data: labels.map((l) => getEscalated(groupMap[l])),
                backgroundColor: '#9FA8DA',
                borderRadius: 4,
                maxBarThickness: 40,
            },
            {
                id: 'active',
                label: 'Active',
                data: labels.map((l) => getActive(groupMap[l])),
                backgroundColor: '#FFD54F',
                borderRadius: 4,
                maxBarThickness: 40,
            },
        ];

        let filteredDatasets = allDatasets;
        if (filterStatus !== 'all') {
            filteredDatasets = allDatasets.filter((ds) => ds.id === filterStatus);
        } else {
            filteredDatasets = allDatasets.filter((ds) => ds.id !== 'active');
        }

        return {
            labels,
            datasets: filteredDatasets,
        };
    }, [safeTickets, filterStatus]);

    const handleCardFilterChange = (status: string) => {
        setFilterStatus(status);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        destroyExistingChart(canvas);

        const chart = new ChartJS(canvas, {
            type: 'bar',
            data: subCategoryChartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right' as const,
                        labels: {
                            color: '#666',
                            font: { size: 10 },
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 10,
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#011A80',
                        bodyColor: '#333',
                        borderColor: '#cce6ff',
                        borderWidth: 1,
                        padding: 10,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#666', font: { size: 10 } },
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#666',
                            font: { size: 9 },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                        },
                    },
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
    }, [subCategoryChartData]);

    if (!category) {
        return (
            <div className="w-full p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm font-bold text-slate-500">
                No category data available. Please return to the dashboard view.
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-slate-50/50 p-4 flex flex-col overflow-hidden">
            <div className="w-full flex-1 flex flex-col gap-6 overflow-y-auto pr-1 pb-20">
                {/* Heading */}
                <div className="w-full flex items-center shrink-0 pt-1">
                    <h2 className="text-2xl font-extrabold text-[#011A80] m-0 tracking-tight">Analysis: {category.title}</h2>
                </div>

                <KpiMetricsGrid
                    activeKey={filterStatus}
                    items={[
                        { key: 'all', label: 'Total Tickets', value: stats.total },
                        { key: 'resolved', label: 'Resolved Tickets', value: stats.resolved },
                        { key: 'escalated', label: 'Escalated Tickets', value: stats.escalated },
                        { key: 'active', label: 'Active Tickets', value: stats.active },
                    ]}
                    onItemClick={(key) => handleCardFilterChange(key)}
                    containerClassName="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full flex-shrink-0"
                />

                {/* Sub-Category Distribution Chart */}
                <div className="w-full bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm shrink-0 [box-shadow:inset_0_2px_10px_0_#abc2ff]">
                    <div className="flex items-center justify-between mb-4">
                        <h6 className="text-xs font-bold text-[#011A80] uppercase tracking-wide">
                            {filterStatus === 'all' ? 'Status Distribution by Sub-Category' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Distribution`}
                        </h6>
                    </div>
                    <div className="h-55 relative w-full">
                        <canvas ref={canvasRef} />
                    </div>
                </div>

                <TicketTable filteredTickets={safeTickets} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
            </div>
        </div>
    );
};

export default ATECategoryAnalysis;
