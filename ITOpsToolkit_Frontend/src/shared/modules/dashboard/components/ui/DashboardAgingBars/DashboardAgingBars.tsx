export type AgingTone = 'good' | 'warning' | 'serious' | 'critical';

export interface AgingBucket {
    label: string;
    count: number;
    tone: AgingTone;
}

const TONE_COLOR: Record<AgingTone, string> = {
    good: '#2e9e4f',
    warning: '#e8a33d',
    serious: '#d0665a',
    critical: '#c0392f',
};

export function DashboardAgingBars({ buckets }: { buckets: AgingBucket[] }) {
    const max = Math.max(1, ...buckets.map((b) => b.count));

    return (
        <div>
            {buckets.map((b) => (
                <div
                    key={b.label}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '130px 1fr 48px',
                        alignItems: 'center',
                        gap: 10,
                        margin: '9px 0',
                    }}
                >
                    <span style={{ fontSize: 12.5, color: '#3f6aa8' }}>{b.label}</span>
                    <div
                        style={{
                            height: 12,
                            background: '#eaf2fb',
                            borderRadius: 999,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${(b.count / max) * 100}%`,
                                background: TONE_COLOR[b.tone],
                                borderRadius: 999,
                                borderRight: '2px solid #ffffff',
                            }}
                        />
                    </div>
                    <span
                        style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            color: '#0f2557',
                        }}
                    >
                        {b.count}
                    </span>
                </div>
            ))}
        </div>
    );
}
