import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, type ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export interface TrendPoint {
    label: string;
    created: number;
    updated: number;
}

const TEAL = '#46c2d3';
const GREEN = '#35a45a';

const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: '#ffffff',
            titleColor: '#0f2557',
            bodyColor: '#3f6aa8',
            borderColor: 'rgba(20,50,110,0.22)',
            borderWidth: 1,
            padding: 10,
            titleFont: { weight: 'bold' },
            callbacks: {
                title: (context) => {
                    return context[0]?.label || '';
                },
                label: (context) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    return `${label}: ${value}`;
                },
            },
        },
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: {
                color: '#8aa3c4',
                font: { size: 11 },
                maxTicksLimit: 8,
                maxRotation: 0,
            },
            border: { color: '#e2edf9' },
        },
        y: {
            grid: { color: '#e2edf9' },
            ticks: { color: '#8aa3c4', font: { size: 11 } },
            border: { display: false },
            beginAtZero: true,
        },
    },
};

export function DashboardTrendChart({ data }: { data: TrendPoint[] }) {
    const chartData = {
        labels: data.map((d) => d.label),
        datasets: [
            {
                label: 'Created',
                data: data.map((d) => d.created),
                borderColor: TEAL,
                backgroundColor: `${TEAL}28`,
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Active (Updated)',
                data: data.map((d) => d.updated),
                borderColor: GREEN,
                backgroundColor: `${GREEN}1a`,
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const totalCreated = data.reduce((sum, d) => sum + d.created, 0);
    const totalUpdated = data.reduce((sum, d) => sum + d.updated, 0);

    return (
        <div>
            <div style={{ height: 260, position: 'relative' }}>
                <Line data={chartData} options={options} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                {[
                    { label: 'Created', color: TEAL, count: totalCreated },
                    { label: 'Active (Updated)', color: GREEN, count: totalUpdated },
                ].map((item) => (
                    <div key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3f6aa8' }}>
                        <span style={{ width: 16, height: 3, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <span>{item.label}</span>
                        <span style={{ fontWeight: 600, color: '#0f2557' }}>({item.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
