import React from 'react';

export interface HeatmapRow {
    group: string;
    counts: Record<string, number>;
    total: number;
}

export interface DashboardHeatmapProps {
    rows: HeatmapRow[];
    max: number;
    priorities?: string[];
    groupHeader?: string;
}

const DEFAULT_PRIOS = ['1', '2', '3', '4'];
const TEAL_RGB: [number, number, number] = [70, 194, 211];
const SURFACE_RGB: [number, number, number] = [234, 242, 251];

function blend(fg: [number, number, number], bg: [number, number, number], a: number): [number, number, number] {
    return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a))) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
    const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function DashboardHeatmap({ rows, max, priorities = DEFAULT_PRIOS, groupHeader = 'Assignment Group' }: DashboardHeatmapProps) {
    const cellStyle = (count: number): React.CSSProperties => {
        if (count === 0) return { background: '#eaf2fb', color: '#8aa3c4' };
        const intensity = max > 0 ? count / max : 0;
        const alpha = 0.1 + 0.85 * intensity;
        const bg = blend(TEAL_RGB, SURFACE_RGB, alpha);
        const text = luminance(bg) < 0.5 ? '#ffffff' : '#0b0b0b';
        return { background: `rgb(${bg[0]} ${bg[1]} ${bg[2]})`, color: text };
    };

    if (rows.length === 0) {
        return <div className="flex items-center justify-center py-8 text-sm text-(--brand-title-primary-color) opacity-50">No data available</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3 }}>
                <thead>
                    <tr>
                        <th className="text-left text-[0.7rem] text-(--brand-title-primary-color) opacity-50 font-semibold px-1 py-1 max-w-[180px]">{groupHeader}</th>
                        {priorities.map((p) => (
                            <th key={p} className="text-center text-[0.7rem] text-(--brand-title-primary-color) opacity-50 font-semibold p-1">
                                P{p}
                            </th>
                        ))}
                        <th className="text-center text-[0.7rem] text-(--brand-title-primary-color) opacity-50 font-semibold p-1">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.group}>
                            <th className="text-left text-xs font-medium text-(--brand-title-primary-color) px-1 max-w-[180px]">
                                <span className="block overflow-hidden text-ellipsis whitespace-nowrap max-w-[170px]" title={r.group}>
                                    {r.group}
                                </span>
                            </th>
                            {priorities.map((p) => {
                                const count = r.counts[p] ?? 0;
                                return (
                                    <td key={p} className="p-0">
                                        <div
                                            className="rounded-[6px] text-center text-xs font-bold py-2.5 px-1.5 border border-[rgba(20,50,110,0.10)]"
                                            style={cellStyle(count)}
                                            title={`${r.group} · P${p}: ${count}`}
                                        >
                                            {count > 0 ? count : '·'}
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="p-0">
                                <div className="bg-[#eaf2fb] text-(--brand-title-primary-color) rounded-[6px] text-center text-xs font-bold py-2.5 px-1.5 border border-[rgba(20,50,110,0.10)]">
                                    {r.total}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
