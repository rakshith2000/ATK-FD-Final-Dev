import { useMemo } from 'react';
import { Activity, Layers, AlertOctagon, AlertTriangle, Minus, ArrowDown, XCircle, Clock, CheckCircle, FileText, Play, CircleDot } from 'lucide-react';
import type { StatCardVariant } from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import type { SCRequestStatsResult } from '../hooks/useSCRequestStatsByPriorityAndGroupByState';
import StatCard from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import { DashboardAlertBanner } from '@/shared/modules/dashboard/components/ui/DashboardAlertBanner/DashboardAlertBanner';
import SCRequestTable from '../components/smart/SCRequestTable/SCRequestTable';
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
    { value: 'requested', label: 'Pending Approval', desc: 'Awaiting approval/action', variant: 'navy', icon: <FileText size={20} /> },
    { value: 'in_process', label: 'Approved', desc: 'Fulfillment in progress', variant: 'blue', icon: <Play size={20} /> },
    { value: 'closed_complete', label: 'Closed Complete', desc: 'Fulfilled successfully', variant: 'sky', icon: <CheckCircle size={20} /> },
    { value: 'closed_incomplete', label: 'Closed Incomplete', desc: 'Partially or unfulfilled', variant: 'light', icon: <AlertTriangle size={20} /> },
    { value: 'closed_cancelled', label: 'Closed Cancelled', desc: 'Withdrawn or voided', variant: 'navy', icon: <XCircle size={20} /> },
    { value: 'closed_rejected', label: 'Closed Rejected', desc: 'Approval declined', variant: 'blue', icon: <Minus size={20} /> },
];

const PRIORITY_CARDS = [
    { value: '1', label: 'Critical (P1)', variant: 'navy' as const, icon: <AlertOctagon size={20} /> },
    { value: '2', label: 'High (P2)', variant: 'blue' as const, icon: <AlertTriangle size={20} /> },
    { value: '3', label: 'Moderate (P3)', variant: 'sky' as const, icon: <Minus size={20} /> },
    { value: '4', label: 'Low (P4)', variant: 'light' as const, icon: <ArrowDown size={20} /> },
    { value: '5', label: 'Planning (P5)', variant: 'light' as const, icon: <CircleDot size={20} /> },
];

interface QueuePageProps {
    data: SCRequestStatsResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    isRefetching: boolean;
    selectedDrilldownState: string | null;
    selectedDrilldownGroup: string | null;
    slaData?: TaskSlaResult;
    slaIsLoading?: boolean;
    slaIsError?: boolean;
    slaError?: Error | null;
}

export function QueuePage({ data, isLoading, isError, error, refetch, isRefetching, selectedDrilldownState, selectedDrilldownGroup, slaData }: QueuePageProps) {
    const rawRequests = data?.raw_sc_requests ?? [];
    const tableData = useMemo(() => {
        if (!selectedDrilldownState && !selectedDrilldownGroup) return rawRequests;
        return rawRequests.filter((req) => {
            const reqState = req.request_state?.value || req.state?.value;
            const matchesState = !selectedDrilldownState || reqState === selectedDrilldownState;
            const matchesGroup = !selectedDrilldownGroup || req.assignment_group?.value === selectedDrilldownGroup;
            return matchesState && matchesGroup;
        });
    }, [rawRequests, selectedDrilldownState, selectedDrilldownGroup]);

    const stateMap = useMemo(() => Object.fromEntries((data?.state_stats ?? []).map((s) => [s.value, s.count])), [data?.state_stats]);
    const priorityMap = useMemo(() => Object.fromEntries((data?.priority_stats ?? []).map((p) => [p.value, p.count])), [data?.priority_stats]);

    const criticalRequests = useMemo(() => {
        return rawRequests.filter((r) => {
            const p = r.priority?.value;
            return p === '1' || p === '2';
        });
    }, [rawRequests]);

    const activeFulfillmentCount = (stateMap['in_process'] ?? 0) + (stateMap['requested'] ?? 0);
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
            {/* ── Section 1: Critical alert & KPIs ── */}
            <div className="db-section">
                <SectionTitle title="High Priority Requests" desc="P1/P2 Service Requests requiring expedited fulfillment" />
                <div className="db-grid cols-4">
                    <DashboardAlertBanner
                        title="Critical & High Priority Requests"
                        count={criticalRequests.length}
                        subtitle="P1/P2 requests pending completion"
                        items={criticalRequests.map((r) => ({
                            id: r.sys_id?.value || r.number?.display_value || '',
                            tag: `P${r.priority?.value ?? '0'}`,
                            label: `${r.number?.display_value} · ${r.short_description?.display_value || 'No description'}`,
                        }))}
                        emptyText="No critical or high priority requests pending."
                    />
                    <StatCard title="Active In-Flight" value={activeFulfillmentCount} variant="navy" icon={<Activity size={20} />} subtitle="Requested + In Process stages" />
                    <StatCard title="Total Requests" value={totalCount} variant="light" icon={<Layers size={20} />} subtitle="in selected period & filters" />
                </div>
            </div>

            {/* ── Section 2: SLA Health (moved to mirror Incident dashboard) ── */}
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

            {/* ── Section 3: Request queue ── */}
            <div className="db-section">
                <SectionTitle title="Service Request Queue" desc="Lifecycle stage distribution" />
                <div className="db-grid cols-6">
                    {STATE_QUEUE.map((s) => (
                        <StatCard key={s.value} title={s.label} value={stateMap[s.value] ?? 0} variant={s.variant} icon={s.icon} subtitle={s.desc} />
                    ))}
                </div>
            </div>

            {/* ── Section 4: Priority breakdown ── */}
            <div className="db-section">
                <SectionTitle title="Requests by Priority" desc="Priority distribution of service requests" />
                <div className="db-grid cols-4">
                    {PRIORITY_CARDS.map((p) => {
                        const count = priorityMap[p.value] ?? 0;
                        const isUrgentCritical = p.value === '1' && count > 0;

                        return (
                            <StatCard
                                key={p.value}
                                title={p.label}
                                value={count}
                                variant={isUrgentCritical ? 'alert' : p.variant}
                                icon={p.icon}
                                subtitle={totalCount > 0 ? `${Math.round((count / totalCount) * 100)}% of total` : undefined}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ── Section 5: Requests table ── */}
            <div
                className="rounded-[14px] border border-[rgba(20,50,110,0.12)] overflow-hidden h-[520px]"
                style={{ boxShadow: '0 1px 2px rgba(20,50,110,0.05), 0 8px 24px rgba(20,50,110,0.08)' }}
            >
                <SCRequestTable data={tableData} isLoading={isLoading} isError={isError} error={error} isRefetching={isRefetching} refetch={refetch} />
            </div>
        </div>
    );
}
