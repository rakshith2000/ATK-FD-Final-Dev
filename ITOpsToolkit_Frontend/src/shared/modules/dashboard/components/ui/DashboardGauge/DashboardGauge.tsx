const STATUS_GOOD = '#2e9e4f';
const STATUS_WARNING = '#e8a33d';
const STATUS_CRITICAL = '#c0392f';
const GRID_COLOR = '#e2edf9';
const TEXT_MUTED = '#8aa3c4';
const TEXT_PRIMARY = '#0f2557';

function polar(cx: number, cy: number, r: number, frac: number) {
    const angle = Math.PI * (1 - frac);
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
    const s = polar(cx, cy, r, from);
    const e = polar(cx, cy, r, to);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}

interface DashboardGaugeProps {
    value: number | null;
    target?: number;
    label?: string;
    higherIsBetter?: boolean;
}

export function DashboardGauge({ value, target, label, higherIsBetter = true }: DashboardGaugeProps) {
    const v = value == null ? 0 : Math.max(0, Math.min(1, value));
    const W = 180;
    const H = 104;
    const cx = W / 2;
    const cy = 92;
    const r = 74;

    let color = STATUS_GOOD;
    if (target != null) {
        const meets = higherIsBetter ? v >= target : v <= target;
        const close = higherIsBetter ? v >= target * 0.92 : v <= target * 1.08;
        color = meets ? STATUS_GOOD : close ? STATUS_WARNING : STATUS_CRITICAL;
    }

    const targetLineEl =
        target != null
            ? (() => {
                  const inner = polar(cx, cy, r - 9, target);
                  const outer = polar(cx, cy, r + 9, target);
                  return <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={TEXT_PRIMARY} strokeWidth={2} />;
              })()
            : null;

    return (
        <div style={{ position: 'relative', width: W, height: H }}>
            <svg width={W} height={H} role="img" aria-label={`${label ?? 'value'} ${Math.round(v * 100)}%`}>
                <path d={arcPath(cx, cy, r, 0, 1)} fill="none" stroke={GRID_COLOR} strokeWidth={12} strokeLinecap="round" />
                {value != null && <path d={arcPath(cx, cy, r, 0, Math.max(0.0001, v))} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />}
                {targetLineEl}
            </svg>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    top: 26,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                }}
            >
                <div>
                    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color }}>{value == null ? '—' : `${Math.round(v * 100)}%`}</div>
                    {target != null && (
                        <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                            Target {higherIsBetter ? '≥' : '≤'} {Math.round(target * 100)}%
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
