import { useMemo } from 'react';
import { Activity, Layers, AlertOctagon, AlertTriangle, Minus, ArrowDown, XCircle, Clock, CheckCircle, FileText, Search, Wrench, ShieldCheck, CircleDot } from 'lucide-react';
import type { StatCardVariant } from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import type { ProblemStatsResult } from '../hooks/useProblemStatsByPriorityAndGroupByState';
import StatCard from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import { DashboardAlertBanner } from '@/shared/modules/dashboard/components/ui/DashboardAlertBanner/DashboardAlertBanner';
import ProblemsTable from '../components/smart/ProblemsTable/ProblemsTable';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
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

const STATE_QUEUE: { value: string; label: string; desc: string; variant: StatCardVariant; icon: React.ReactNode }[] = [
    { value: '101', label: 'New', desc: 'Initial logging', variant: 'navy', icon: <FileText size={20} /> },
    { value: '102', label: 'Assess', desc: 'Triage & assessment', variant: 'blue', icon: <Search size={20} /> },
    { value: '103', label: 'Root Cause Analysis', desc: 'RCA in progress', variant: 'sky', icon: <Activity size={20} /> },
    { value: '104', label: 'Fix in Progress', desc: 'Fix implementation', variant: 'light', icon: <Wrench size={20} /> },
    { value: '106', label: 'Resolved', desc: 'Workaround / fix verified', variant: 'navy', icon: <CheckCircle size={20} /> },
    { value: '107', label: 'Closed', desc: 'Known error or closed', variant: 'blue', icon: <ShieldCheck size={20} /> },
];

const PRIORITY_CARDS = [
    { value: '1', label: 'Critical (P1)', variant: 'alert' as const, icon: <AlertOctagon size={20} /> },
    { value: '2', label: 'High (P2)', variant: 'blue' as const, icon: <AlertTriangle size={20} /> },
    { value: '3', label: 'Moderate (P3)', variant: 'sky' as const, icon: <Minus size={20} /> },
    { value: '4', label: 'Low (P4)', variant: 'light' as const, icon: <ArrowDown size={20} /> },
    { value: '5', label: 'Planning (P5)', variant: 'light' as const, icon: <CircleDot size={20} /> },
];

interface QueuePageProps {
    data: ProblemStatsResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    isRefetching: boolean;
    selectedDrilldownState: string | null;
    selectedDrilldownGroup: string | null;
    slaData?: TaskSlaResult;
}

export function QueuePage({ data, isLoading, isError, error, refetch, isRefetching, selectedDrilldownState, selectedDrilldownGroup, slaData }: QueuePageProps) {
    const rawProblems = data?.raw_problems ?? [];

    const tableData = useMemo(() => {
        if (!selectedDrilldownState && !selectedDrilldownGroup) return rawProblems;
        return rawProblems.filter((prob) => {
            const matchesState = !selectedDrilldownState || prob.state?.value === selectedDrilldownState;
            const matchesGroup = !selectedDrilldownGroup || prob.assignment_group?.value === selectedDrilldownGroup;
            return matchesState && matchesGroup;
        });
    }, [rawProblems, selectedDrilldownState, selectedDrilldownGroup]);

    const stateMap = useMemo(() => Object.fromEntries((data?.state_stats ?? []).map((s) => [s.value, s.count])), [data?.state_stats]);
    const priorityMap = useMemo(() => Object.fromEntries((data?.priority_stats ?? []).map((p) => [p.value, p.count])), [data?.priority_stats]);

    const criticalProblems = useMemo(() => {
        return rawProblems.filter((p) => {
            const prio = p.priority?.value;
            return prio === '1' || prio === '2';
        });
    }, [rawProblems]);

    const activeInvestigationCount = (stateMap['102'] ?? 0) + (stateMap['103'] ?? 0) + (stateMap['104'] ?? 0);
    const totalCount = data?.total_count ?? 0;

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

    return (
        <div className="flex flex-col gap-1 p-5 pt-2 min-h-full">
            <div className="db-section">
                <SectionTitle title="Critical & High Priority Problems" desc="Problems requiring urgent root cause analysis" />
                <div className="db-grid cols-4">
                    <DashboardAlertBanner
                        title="Critical & High Priority Problems"
                        count={criticalProblems.length}
                        subtitle="P1/P2 problems under investigation"
                        items={criticalProblems.map((p) => ({
                            id: p.sys_id?.value || p.number?.display_value || '',
                            tag: `P${p.priority?.value ?? '0'}`,
                            label: `${p.number?.display_value} · ${p.short_description?.display_value || 'No description'}`,
                        }))}
                        emptyText="No critical or high priority problems pending."
                    />
                    <StatCard title="In Active Investigation" value={activeInvestigationCount} variant="navy" icon={<Activity size={20} />} subtitle="Assess + RCA + Fix stages" />
                    <StatCard title="Total Problems" value={totalCount} variant="light" icon={<Layers size={20} />} subtitle="in selected period & filters" />
                </div>
            </div>

            <div className="db-section">
                <SectionTitle title="Problem Lifecycle Queue" desc="Lifecycle stage distribution" />
                <div className="db-grid cols-6">
                    {STATE_QUEUE.map((s) => (
                        <StatCard key={s.value} title={s.label} value={stateMap[s.value] ?? 0} variant={s.variant} icon={s.icon} subtitle={s.desc} />
                    ))}
                </div>
            </div>

            <div className="db-section">
                <SectionTitle title="Problems by Priority" desc="Severity mix of current problems" />
                <div className="db-grid cols-6">
                    {PRIORITY_CARDS.map((p) => (
                        <StatCard
                            key={p.value}
                            title={p.label}
                            value={priorityMap[p.value] ?? 0}
                            variant={p.variant}
                            icon={p.icon}
                            subtitle={totalCount > 0 ? `${Math.round(((priorityMap[p.value] ?? 0) / totalCount) * 100)}% of total` : undefined}
                        />
                    ))}
                </div>
            </div>

            {slaData && slaData.total > 0 && (
                <div className="db-section">
                    <SectionTitle title="SLA Health" desc={`${slaData.total} active SLA records`} />
                    <div className="db-grid cols-3">
                        <StatCard
                            title="Breached"
                            value={slaData.breached}
                            variant="alert"
                            icon={<XCircle size={20} />}
                            subtitle={`${slaData.total > 0 ? Math.round((slaData.breached / slaData.total) * 100) : 0}% of SLAs`}
                        />
                        <StatCard
                            title="At Risk (≥ 75%)"
                            value={slaData.atRisk}
                            variant="alert-text"
                            icon={<Clock size={20} />}
                            subtitle={`${slaData.total > 0 ? Math.round((slaData.atRisk / slaData.total) * 100) : 0}% of SLAs`}
                        />
                        <StatCard
                            title="Compliant"
                            value={slaData.compliant}
                            variant="light"
                            icon={<CheckCircle size={20} />}
                            subtitle={`${slaData.total > 0 ? Math.round((slaData.compliant / slaData.total) * 100) : 0}% of SLAs`}
                        />
                    </div>
                </div>
            )}

            <div
                className="rounded-[14px] border border-[rgba(20,50,110,0.12)] overflow-hidden h-[300px]"
                style={{ boxShadow: '0 1px 2px rgba(20,50,110,0.05), 0 8px 24px rgba(20,50,110,0.08)' }}
            >
                <ProblemsTable data={tableData} isLoading={isLoading} isError={isError} error={error} isRefetching={isRefetching} refetch={refetch} />
            </div>
        </div>
    );
}
