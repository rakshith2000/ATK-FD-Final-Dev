import { useMemo } from 'react';
import { BarChart3, Zap, Clock, Timer, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';
import type { ProblemStatsResult } from '../hooks/useProblemStatsByPriorityAndGroupByState';
import StatCard from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import { DashboardCard, DashboardCardHead } from '@/shared/modules/dashboard/components/ui/DashboardCard/DashboardCard';
import { DashboardGauge } from '@/shared/modules/dashboard/components/ui/DashboardGauge/DashboardGauge';
import { DashboardBarChart, type BarChartItem } from '@/shared/modules/dashboard/components/ui/DashboardBarChart/DashboardBarChart';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import type { TaskSlaResult } from '@/shared/modules/dashboard/hooks/useTaskSlas';

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

const CATEGORY_COLORS: Record<string, string> = {
    Software: '#2f5fb0',
    Hardware: '#46c2d3',
    Network: '#e8a33d',
    Infrastructure: '#d0473e',
    Database: '#35a45a',
    General: '#8aa3c4',
};

function getCategoryColor(cat: string): string {
    for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
        if (cat.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return '#2f5fb0';
}

const CRITICAL_TARGET = 0.2;
const RCA_PROGRESS_TARGET = 0.5;
const SLA_COMPLIANCE_TARGET = 0.9;

interface PerformancePageProps {
    data: ProblemStatsResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    slaData?: TaskSlaResult;
}

export function PerformancePage({ data, isLoading, isError, error, refetch, slaData }: PerformancePageProps) {
    const rawProblems = data?.raw_problems ?? [];
    const total = data?.total_count ?? 0;

    const { criticalCount, criticalRatio, avgAgeDays, rcaProgressRatio } = useMemo(() => {
        if (rawProblems.length === 0) return { criticalCount: 0, criticalRatio: 0, avgAgeDays: 0, rcaProgressRatio: 0 };

        const critical = rawProblems.filter((p) => {
            const prio = p.priority?.value;
            return prio === '1' || prio === '2';
        });

        const now = Date.now();
        const ages = rawProblems
            .map((c) => {
                const d = parseDate(c.sys_created_on);
                return d ? (now - d.getTime()) / (1000 * 60 * 60 * 24) : null;
            })
            .filter((a): a is number => a !== null);

        const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

        const resolvedOrClosed = rawProblems.filter((p) => {
            const s = p.state?.value;
            return s === '106' || s === '107';
        });

        return {
            criticalCount: critical.length,
            criticalRatio: total > 0 ? critical.length / total : 0,
            avgAgeDays: avgAge,
            rcaProgressRatio: total > 0 ? resolvedOrClosed.length / total : 0,
        };
    }, [rawProblems, total]);

    const { mttrDays, slaComplianceRatio, slaClosedCount, reopenRatio, reopenCount } = useMemo(() => {
        const closed = rawProblems.filter((c) => {
            const closedAt = c.closed_at?.value || c.closed_at?.display_value || c.resolved_at?.value || c.resolved_at?.display_value;
            return !!closedAt;
        });

        const resolutionTimes = closed
            .map((c) => {
                const created = parseDate(c.sys_created_on);
                const closedAt = parseDate((c.closed_at || c.resolved_at) as Parameters<typeof parseDate>[0]);
                if (!created || !closedAt) return null;
                return (closedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            })
            .filter((v): v is number => v !== null && v >= 0);

        const mttr = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

        const relaxationSla = closed.filter((c) => {
            const v = c.made_sla?.value || c.made_sla?.display_value;
            return v === 'true' || v === '1';
        }).length;

        const reopened = rawProblems.filter((c) => {
            const v = c.reopen_count?.value || c.reopen_count?.display_value;
            return parseInt(v ?? '0', 10) > 0;
        }).length;

        return {
            mttrDays: mttr,
            slaComplianceRatio: closed.length > 0 ? relaxationSla / closed.length : 0,
            slaClosedCount: closed.length,
            reopenRatio: total > 0 ? reopened / total : 0,
            reopenCount: reopened,
        };
    }, [rawProblems, total]);

    const categoryData = useMemo((): BarChartItem[] => {
        const counts: Record<string, number> = {};
        rawProblems.forEach((c) => {
            const label = c.category?.display_value || 'Unknown';
            counts[label] = (counts[label] ?? 0) + 1;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([label, count]) => ({
                label,
                count,
                color: getCategoryColor(label),
            }));
    }, [rawProblems]);

    const stateData = useMemo((): BarChartItem[] => {
        const counts: Record<string, number> = {};
        rawProblems.forEach((c) => {
            const label = c.state?.display_value || 'Unknown';
            counts[label] = (counts[label] ?? 0) + 1;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([label, count]) => ({
                label,
                count,
                color: '#2f5fb0',
            }));
    }, [rawProblems]);

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
                <EmptyPlaceholder message="No problems found for the selected filters." />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-5 min-h-full">
            <div className="db-section">
                <SectionTitle title="Performance Indicators" desc={`${total} problems in selected period`} />
                <div className="db-grid cols-4">
                    <StatCard title="Total Problems" value={total} variant="navy" icon={<BarChart3 size={20} />} subtitle="in selected period" />
                    <StatCard
                        title="Critical & High (P1/P2)"
                        value={criticalCount}
                        variant="blue"
                        icon={<Zap size={20} />}
                        subtitle={`${Math.round(criticalRatio * 100)}% of total`}
                    />
                    <StatCard
                        title="Resolution Rate"
                        value={`${Math.round(rcaProgressRatio * 100)}%`}
                        variant="sky"
                        icon={<ShieldAlert size={20} />}
                        subtitle="resolved or closed"
                    />
                    <StatCard title="Average Age" value={fmtDays(avgAgeDays)} variant="light" icon={<Clock size={20} />} subtitle="since creation · all open problems" />
                </div>
            </div>

            <div className="db-section">
                <SectionTitle title="Problem Distribution" desc="By category and lifecycle state" />
                <div className="db-grid cols-2">
                    <DashboardCard>
                        <DashboardCardHead title="Problems by Category" subtitle="Distribution across technical domain" />
                        <div className="db-card-body">
                            {categoryData.length > 0 ? (
                                <DashboardBarChart data={categoryData} title="Problems by Category" />
                            ) : (
                                <EmptyPlaceholder message="No category data available." />
                            )}
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHead title="Problems by State" subtitle="Lifecycle stage counts" />
                        <div className="db-card-body">
                            {stateData.length > 0 ? <DashboardBarChart data={stateData} title="Problems by State" /> : <EmptyPlaceholder message="No state data available." />}
                        </div>
                    </DashboardCard>
                </div>
            </div>

            <div className="db-section">
                <SectionTitle title="Quality & Resolution" desc="Ratios vs service level targets" />
                <div className="db-grid cols-3">
                    <DashboardCard>
                        <DashboardCardHead title="Critical Problem Ratio" subtitle="Target < 20% of total" />
                        <div className="db-card-body grid place-items-center">
                            <DashboardGauge value={criticalRatio} target={CRITICAL_TARGET} label="Critical ratio" higherIsBetter={false} />
                            <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">
                                {criticalCount} of {total} problems
                            </p>
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHead title="RCA & Resolution Progress" subtitle="Target > 50% resolved" />
                        <div className="db-card-body grid place-items-center">
                            <DashboardGauge value={rcaProgressRatio} target={RCA_PROGRESS_TARGET} label="Resolution rate" higherIsBetter={true} />
                            <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">
                                {Math.round(rcaProgressRatio * total)} of {total} resolved
                            </p>
                        </div>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHead title="SLA Compliance Rate" subtitle="Target ≥ 90% of closed problems" />
                        <div className="db-card-body grid place-items-center">
                            <DashboardGauge value={slaComplianceRatio} target={SLA_COMPLIANCE_TARGET} label="SLA compliance" higherIsBetter={true} />
                            <p className="text-[0.7rem] text-(--brand-title-primary-color) opacity-50 mt-2 text-center">
                                {slaClosedCount > 0 ? `${Math.round(slaComplianceRatio * slaClosedCount)} of ${slaClosedCount} met SLA` : 'No closed problems in period'}
                            </p>
                        </div>
                    </DashboardCard>
                </div>
            </div>

            <div className="db-section">
                <SectionTitle title="Resolution & SLA Metrics" desc="Based on closed problems and active SLA tasks" />
                <div className="db-grid cols-3">
                    <StatCard
                        title="Mean Time to Resolve (MTTR)"
                        value={slaClosedCount > 0 ? fmtDays(mttrDays) : '—'}
                        variant="navy"
                        icon={<Timer size={20} />}
                        subtitle={slaClosedCount > 0 ? `across ${slaClosedCount} closed problems` : 'no closed problems in period'}
                    />
                    <StatCard title="Reopened Problems" value={reopenCount} variant="sky" icon={<RotateCcw size={20} />} subtitle={`${Math.round(reopenRatio * 100)}% of total`} />
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
        </div>
    );
}
