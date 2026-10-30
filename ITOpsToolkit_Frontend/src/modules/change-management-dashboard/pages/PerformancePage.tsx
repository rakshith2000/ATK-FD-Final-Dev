import { useMemo } from 'react';
import { BarChart3, Zap, ShieldAlert, Clock, Timer, RotateCcw, AlertCircle } from 'lucide-react';
import type { ChangeStatsResult } from '../hooks/useChangeStatsByPriorityAndGroupByState';
import type { ChangeSlaResult } from '../hooks/useChangeSlas';
import StatCard from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import { DashboardCard, DashboardCardHead } from '@/shared/modules/dashboard/components/ui/DashboardCard/DashboardCard';
import { DashboardGauge } from '@/shared/modules/dashboard/components/ui/DashboardGauge/DashboardGauge';
import { DashboardBarChart, type BarChartItem } from '@/shared/modules/dashboard/components/ui/DashboardBarChart/DashboardBarChart';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';

/* ─────────────────────────── helpers ──────────────────────────── */

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
    return (
        <div className="flex items-baseline gap-3 mb-4">
            <span className="db-section-title text-base">{title}</span>
            {desc && <span className="text-xs text-(--brand-title-primary-color) opacity-70">{desc}</span>}
        </div>
    );
}

function parseDate(field?: { value?: string | null; display_value?: string | null }): Date | null {
    const raw = field?.value || field?.display_value;
    if (!raw) return null;
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
}

function fmtDays(days: number): string {
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 10) return `${days.toFixed(1)}d`;
    return `${Math.round(days)}d`;
}

function isEmergency(c: Record<string, { value: string | null; display_value: string | null }>): boolean {
    const t = (c.type?.display_value ?? '').toLowerCase();
    const v = (c.type?.value ?? '').toLowerCase();
    return t.includes('emergency') || t.includes('expedit') || v.includes('emergency') || v.includes('expedit');
}

function isHighRisk(c: Record<string, { value: string | null; display_value: string | null }>): boolean {
    const r = (c.risk?.display_value ?? '').toLowerCase();
    const v = (c.risk?.value ?? '').toLowerCase();
    return r.includes('high') || r.includes('critical') || v === '1' || v === '2';
}

const RISK_COLORS: Record<string, string> = {
    Critical: '#a32633',
    High: '#d0473e',
    Moderate: '#e8a33d',
    Low: '#35a45a',
    Planning: '#8aa3c4',
};

const TYPE_COLORS: Record<string, string> = {
    Emergency: '#c0392f',
    Expedited: '#d0473e',
    Normal: '#46c2d3',
    Standard: '#2f5fb0',
};

function getColor(map: Record<string, string>, key: string, fallback: string): string {
    for (const [k, v] of Object.entries(map)) {
        if (key.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return fallback;
}

/* gauges */
const EMERGENCY_TARGET = 0.1;
const HIGH_RISK_TARGET = 0.25;
const EXECUTION_TARGET = 0.3;
const SLA_COMPLIANCE_TARGET = 0.9;

/* ─────────────────────────── component ────────────────────────── */

export interface PerformancePageProps {
    data: ChangeStatsResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    slaData?: ChangeSlaResult;
}

export function PerformancePage({ data, isLoading, isError, error, refetch, slaData }: PerformancePageProps) {
    const rawChanges = data?.raw_changes ?? [];
    const total = data?.total_count ?? 0;

    /* ── KPI metrics ── */
    const { emergencyCount, emergencyRatio, highRiskCount, highRiskRatio, avgAgeDays, executionRatio } = useMemo(() => {
        if (rawChanges.length === 0) return { emergencyCount: 0, emergencyRatio: 0, highRiskCount: 0, highRiskRatio: 0, avgAgeDays: 0, executionRatio: 0 };

        const emergency = rawChanges.filter(isEmergency);
        const highRisk = rawChanges.filter(isHighRisk);

        const now = Date.now();
        const ages = rawChanges
            .map((c) => {
                const d = parseDate(c.sys_created_on);
                return d ? (now - d.getTime()) / (1000 * 60 * 60 * 24) : null;
            })
            .filter((a): a is number => a !== null);

        const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

        const stateMap = Object.fromEntries((data?.state_stats ?? []).map((s) => [s.value, s.count]));
        const executionCount = (stateMap['-1'] ?? 0) + (stateMap['0'] ?? 0);

        return {
            emergencyCount: emergency.length,
            emergencyRatio: total > 0 ? emergency.length / total : 0,
            highRiskCount: highRisk.length,
            highRiskRatio: total > 0 ? highRisk.length / total : 0,
            avgAgeDays: avgAge,
            executionRatio: total > 0 ? executionCount / total : 0,
        };
    }, [rawChanges, total, data?.state_stats]);

    /* ── MTTR, SLA compliance, reopen rate ── */
    const { mttrDays, slaComplianceRatio, slaClosedCount, reopenRatio, reopenCount } = useMemo(() => {
        const closed = rawChanges.filter((c) => {
            const closedAt = c.closed_at?.value || c.closed_at?.display_value;
            return !!closedAt;
        });

        const resolutionTimes = closed
            .map((c) => {
                const created = parseDate(c.sys_created_on);
                const closedAt = parseDate(c.closed_at as Parameters<typeof parseDate>[0]);
                if (!created || !closedAt) return null;
                return (closedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            })
            .filter((v): v is number => v !== null && v >= 0);

        const mttr = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

        const madeSla = closed.filter((c) => {
            const v = c.made_sla?.value || c.made_sla?.display_value;
            return v === 'true' || v === '1';
        }).length;

        const reopened = rawChanges.filter((c) => {
            const v = c.reopen_count?.value || c.reopen_count?.display_value;
            return parseInt(v ?? '0', 10) > 0;
        }).length;

        return {
            mttrDays: mttr,
            slaComplianceRatio: closed.length > 0 ? madeSla / closed.length : 0,
            slaClosedCount: closed.length,
            reopenRatio: total > 0 ? reopened / total : 0,
            reopenCount: reopened,
        };
    }, [rawChanges, total]);

    /* ── Type distribution ── */
    const typeData = useMemo((): BarChartItem[] => {
        const counts: Record<string, number> = {};
        rawChanges.forEach((c) => {
            const label = c.type?.display_value || 'Unknown';
            counts[label] = (counts[label] ?? 0) + 1;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([label, count]) => ({
                label,
                count,
                color: getColor(TYPE_COLORS, label, '#8aa3c4'),
            }));
    }, [rawChanges]);

    /* ── Risk distribution ── */
    const riskData = useMemo((): BarChartItem[] => {
        const counts: Record<string, number> = {};
        rawChanges.forEach((c) => {
            const label = c.risk?.display_value || 'Unknown';
            counts[label] = (counts[label] ?? 0) + 1;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([label, count]) => ({
                label,
                count,
                color: getColor(RISK_COLORS, label, '#8aa3c4'),
            }));
    }, [rawChanges]);

    /* ── render states ── */
    if (isLoading) {
        return (
            <div className="p-5">
                <GridSkeleton GAP={4} rows={2} cols={4} VW={1200} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-5 bg-white rounded-xl border border-[rgba(20,50,110,0.12)]">
                <ErrorPlaceholder iconSize={100} error={error} onRetry={refetch} />
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className="p-5">
                <EmptyPlaceholder message="No change requests found for the selected filters." />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-5 min-h-full">
            {/* ── Section 1: KPI headline cards ── */}
            <div className="db-section">
                <SectionTitle title="Performance Indicators" desc={`${total} changes in selected period`} />
                <div className="db-grid cols-4">
                    <StatCard title="Total Changes" value={total} variant="navy" icon={<BarChart3 size={20} />} subtitle="in selected period" />
                    <StatCard
                        title="Emergency / Expedited"
                        value={emergencyCount}
                        variant="blue"
                        icon={<Zap size={20} />}
                        subtitle={`${Math.round(emergencyRatio * 100)}% of total`}
                    />
                    <StatCard
                        title="High / Critical Risk"
                        value={highRiskCount}
                        variant="sky"
                        icon={<ShieldAlert size={20} />}
                        subtitle={`${Math.round(highRiskRatio * 100)}% of total`}
                    />
                    <StatCard title="Average Age" value={fmtDays(avgAgeDays)} variant="light" icon={<Clock size={20} />} subtitle="since creation · all open changes" />
                </div>
            </div>

            {/* ── Section 2: Distribution charts ── */}
            <div className="db-section">
                <SectionTitle title="Change Distribution" desc="By type and risk level" />
                <div className="db-grid cols-2">
                    <DashboardCard>
                        <DashboardCardHead title="Changes by Type" subtitle="Emergency, Expedited, Normal, Standard breakdown" />
                        <div className="db-card-body">
                            {typeData.length > 0 ? <DashboardBarChart data={typeData} title="Changes by Type" /> : <EmptyPlaceholder message="No type data available." />}
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHead title="Changes by Risk Level" subtitle="Critical, High, Moderate, Low, Planning" />
                        <div className="db-card-body">
                            {riskData.length > 0 ? <DashboardBarChart data={riskData} title="Changes by Risk" /> : <EmptyPlaceholder message="No risk data available." />}
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {/* ── Section 3: Quality gauges ── */}
            <div className="db-section">
                <SectionTitle title="Quality & Composition" desc="Ratios vs targets" />
                <div className="db-grid cols-3">
                    <DashboardCard>
                        <DashboardCardHead title="Emergency Change Ratio" subtitle="Target < 10% of total" />
                        <div className="db-card-body grid place-items-center">
                            <DashboardGauge value={emergencyRatio} target={EMERGENCY_TARGET} label="Emergency ratio" higherIsBetter={false} />
                            <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">
                                {emergencyCount} of {total} changes
                            </p>
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHead title="High / Critical Risk Ratio" subtitle="Target < 25% of total" />
                        <div className="db-card-body grid place-items-center">
                            <DashboardGauge value={highRiskRatio} target={HIGH_RISK_TARGET} label="High risk ratio" higherIsBetter={false} />
                            <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">
                                {highRiskCount} of {total} changes
                            </p>
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHead title="Execution Progress" subtitle="Changes in Implement / Review — target > 30%" />
                        <div className="db-card-body grid place-items-center">
                            <DashboardGauge value={executionRatio} target={EXECUTION_TARGET} label="Execution rate" higherIsBetter={true} />
                            <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">{Math.round(executionRatio * total)} actively executing</p>
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {/* ── Section 4: Resolution & SLA metrics ── */}
            <div className="db-section">
                <SectionTitle title="Resolution & SLA Metrics" desc="Based on closed changes in the selected period" />
                <div className="db-grid cols-3">
                    <StatCard
                        title="Mean Time to Resolve"
                        value={slaClosedCount > 0 ? fmtDays(mttrDays) : '—'}
                        variant="navy"
                        icon={<Timer size={20} />}
                        subtitle={slaClosedCount > 0 ? `across ${slaClosedCount} closed changes` : 'no closed changes in period'}
                    />
                    <StatCard
                        title="Reopen / Failure Rate"
                        value={reopenCount}
                        variant="sky"
                        icon={<RotateCcw size={20} />}
                        subtitle={`${Math.round(reopenRatio * 100)}% of total`}
                    />
                    {slaData && slaData.total > 0 && (
                        <StatCard
                            title="Active SLA Breached"
                            value={slaData.breached}
                            variant="light"
                            icon={<AlertCircle size={20} />}
                            subtitle={`${Math.round((slaData.breached / slaData.total) * 100)}% of ${slaData.total} active SLAs`}
                        />
                    )}
                </div>
            </div>

            {/* ── Section 5: SLA Compliance gauge ── */}
            {slaClosedCount > 0 && (
                <div className="db-section">
                    <SectionTitle title="SLA Compliance" desc="Closed changes that met their SLA target" />
                    <div className="db-grid cols-3">
                        <DashboardCard>
                            <DashboardCardHead title="SLA Compliance Rate" subtitle="Target ≥ 90% of closed changes" />
                            <div className="db-card-body grid place-items-center">
                                <DashboardGauge value={slaComplianceRatio} target={SLA_COMPLIANCE_TARGET} label="SLA compliance" higherIsBetter={true} />
                                <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">
                                    {Math.round(slaComplianceRatio * slaClosedCount)} of {slaClosedCount} closed changes met SLA
                                </p>
                            </div>
                        </DashboardCard>
                    </div>
                </div>
            )}
        </div>
    );
}
