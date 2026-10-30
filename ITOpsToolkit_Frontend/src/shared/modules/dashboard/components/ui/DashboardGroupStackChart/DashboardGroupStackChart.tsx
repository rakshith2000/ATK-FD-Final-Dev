import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, type ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface GroupStackData {
    group: string;
    priorities: Record<string, number>;
}

const PRIORITY_COLORS: Record<string, string> = {
    '1': '#a32633',
    '2': '#d0473e',
    '3': '#e8a33d',
    '4': '#2f5fb0',
    '5': '#3a8f5b',
};

export function DashboardGroupStackChart({ data, title }: { data: GroupStackData[]; title?: string }) {
    const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '…' : s);
    const labels = data.map((d) => truncate(d.group, 28));
    const priorities = title ? ['1', '2', '3', '4'] : ['1', '2', '3', '4', '5'];
    const chartData = {
        labels,
        datasets: priorities.map((p) => ({
            label: `P${p}`,
            data: data.map((d) => d.priorities[p] ?? 0),
            backgroundColor: PRIORITY_COLORS[p],
            borderRadius: 2,
        })),
    };

    const dynamicHeight = Math.max(180, data.length * 36);

    const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: 'y',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: { size: 12 },
                    color: '#3f6aa8',
                    usePointStyle: true,
                    pointStyle: 'rect',
                    padding: 16,
                },
            },
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
                stacked: true,
                grid: { color: '#e2edf9' },
                ticks: { color: '#8aa3c4', font: { size: 11 } },
                border: { display: false },
            },
            y: {
                stacked: true,
                grid: { display: false },
                ticks: { color: '#0f2557', font: { size: 11 } },
                border: { display: false },
            },
        },
    };

    return (
        <div style={{ height: dynamicHeight, position: 'relative' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}
