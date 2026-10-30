import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export interface BarChartItem {
    label: string;
    count: number;
    color: string;
}

export function DashboardBarChart({ data, title }: { data: BarChartItem[]; title?: string }) {
    const chartData = {
        labels: data.map((d) => d.label),
        datasets: [
            {
                label: title ?? 'Count',
                data: data.map((d) => d.count),
                backgroundColor: data.map((d) => d.color),
                borderRadius: 4,
                borderSkipped: false,
            },
        ],
    };

    const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#0f2557',
                bodyColor: '#3f6aa8',
                borderColor: 'rgba(20,50,110,0.22)',
                borderWidth: 1,
                padding: 10,
            },
        },
        scales: {
            x: {
                grid: { color: '#e2edf9' },
                ticks: { color: '#8aa3c4', font: { size: 11 } },
                border: { display: false },
                beginAtZero: true,
            },
            y: {
                grid: { display: false },
                ticks: { color: '#0f2557', font: { size: 11 } },
                border: { display: false },
            },
        },
    };

    return (
        <div style={{ height: Math.max(140, data.length * 36), position: 'relative' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}
