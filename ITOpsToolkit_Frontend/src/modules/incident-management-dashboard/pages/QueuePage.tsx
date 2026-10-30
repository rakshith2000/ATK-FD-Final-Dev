import { useMemo } from 'react';
import {
    Activity,
    Layers,
    AlertOctagon,
    AlertTriangle,
    Minus,
    ArrowDown,
    XCircle,
    Clock,
    CheckCircle,
    FileText,
    Play,
    PauseCircle,
    ShieldCheck,
    CircleDot,
    Ban,
} from 'lucide-react';
import type { StatCardVariant } from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import type { IncidentStatsResult } from '../hooks/useIncidentStatsByPriorityAndGroupByState';
import StatCard from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import { DashboardAlertBanner } from '@/shared/modules/dashboard/components/ui/DashboardAlertBanner/DashboardAlertBanner';
import IncidentsTable from '../components/smart/IncidentsTable/IncidentsTable';
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
    { value: '1', label: 'New', desc: 'Unassigned / logged', variant: 'navy', icon: <FileText size={20} /> },
    { value: '2', label: 'In Progress', desc: 'Active investigation', variant: 'blue', icon: <Play size={20} /> },
    { value: '3', label: 'On Hold', desc: 'Awaiting info / vendor', variant: 'sky', icon: <PauseCircle size={20} /> },
    { value: '6', label: 'Resolved', desc: 'Workaround / fix applied', variant: 'light', icon: <CheckCircle size={20} /> },
    { value: '7', label: 'Closed', desc: 'Confirmed closed', variant: 'navy', icon: <ShieldCheck size={20} /> },
    { value: '8', label: 'Canceled', desc: 'Canceled or invalid', variant: 'blue', icon: <Ban size={20} /> },
];

const PRIORITY_CARDS = [
    { value: '1', label: 'Critical (P1)', variant: 'alert' as const, icon: <AlertOctagon size={20} /> },
    { value: '2', label: 'High (P2)', variant: 'blue' as const, icon: <AlertTriangle size={20} /> },
    { value: '3', label: 'Moderate (P3)', variant: 'sky' as const, icon: <Minus size={20} /> },
    { value: '4', label: 'Low (P4)', variant: 'light' as const, icon: <ArrowDown size={20} /> },
    { value: '5', label: 'Planning (P5)', variant: 'light' as const, icon: <CircleDot size={20} /> },
];

export interface QueuePageProps {
    data: IncidentStatsResult | undefined;
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
    const rawIncidents = data?.raw_incidents ?? [];

    //drilldown-filtered rows for table
    const tableData = useMemo(() => {
        if (!selectedDrilldownState && !selectedDrilldownGroup) return rawIncidents;
        return rawIncidents.filter((inc) => {
            const matchesState = !selectedDrilldownState || inc.state?.value === selectedDrilldownState;
            const matchesGroup = !selectedDrilldownGroup || inc.assignment_group?.value === selectedDrilldownGroup;
            return matchesState && matchesGroup;
        });
    }, [rawIncidents, selectedDrilldownState, selectedDrilldownGroup]);

    //metrics
    const stateMap = useMemo(() => Object.fromEntries((data?.state_stats ?? []).map((s) => [s.value, s.count])), [data?.state_stats]);

    const priorityMap = useMemo(() => Object.fromEntries((data?.priority_stats ?? []).map((p) => [p.value, p.count])), [data?.priority_stats]);

    const criticalIncidents = useMemo(() => {
        return rawIncidents.filter((inc) => {
            const prio = inc.priority?.value;
            return prio === '1' || prio === '2';
        });
    }, [rawIncidents]);

    const activeCount = stateMap['2'] ?? 0;
    const totalCount = data?.total_count ?? 0;

    const tableHeight = useMemo(() => {
        if (isLoading) return 380;
        if (tableData.length === 0) return 240;
        // Toolbar (~44px) + Header (~38px) + ~38px per record + container padding
        const calculated = 92 + tableData.length * 38;
        return Math.min(560, Math.max(calculated, 180));
    }, [isLoading, tableData.length]);

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
            {/* ── Section 1: Critical alert banner & quick KPIs ── */}
            <div className="db-section">
                <SectionTitle title="Critical & High Priority" desc="Incidents requiring immediate attention" />
                <div className="db-grid cols-4">
                    <DashboardAlertBanner
                        count={criticalIncidents.length}
                        items={criticalIncidents.map((inc) => ({
                            id: inc.sys_id?.value || inc.number?.display_value || '',
                            tag: inc.priority?.value === '1' ? 'P1' : 'P2',
                            label: `${inc.number?.display_value} · ${inc.short_description?.display_value || 'No description'}`,
                        }))}
                        title="Critical / High Incidents"
                        subtitle="P1 & P2 incidents currently active"
                        activeBadgeText="P1 / P2"
                        emptyText="No critical or high-priority incidents currently."
                    />
                    <StatCard title="In Progress" value={activeCount} variant="navy" icon={<Activity size={20} />} subtitle="Under active investigation" />
                    <StatCard title="Total Incidents" value={totalCount} variant="light" icon={<Layers size={20} />} subtitle="in selected period & filters" />
                </div>
            </div>

            {/* ── Section 2: SLA Health ── */}
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

            {/* ── Section 3: Incident lifecycle queue ── */}
            <div className="db-section">
                <SectionTitle title="Incident Queue" desc="Lifecycle stage distribution" />
                <div className="db-grid cols-6">
                    {STATE_QUEUE.map((s) => (
                        <StatCard key={s.value} title={s.label} value={stateMap[s.value] ?? 0} variant={s.variant} icon={s.icon} subtitle={s.desc} />
                    ))}
                </div>
            </div>

            {/* ── Section 4: Priority breakdown ── */}
            <div className="db-section">
                <SectionTitle title="Incidents by Priority" desc="Severity distribution" />
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

            {/* ── Section 5: Incidents table ── */}
            <div
                className="rounded-[14px] border border-[rgba(20,50,110,0.12)] overflow-hidden transition-all duration-200"
                style={{
                    height: `${tableHeight}px`,
                    boxShadow: '0 1px 2px rgba(20,50,110,0.05), 0 8px 24px rgba(20,50,110,0.08)',
                }}
            >
                <IncidentsTable data={tableData} isLoading={isLoading} isError={isError} error={error} isRefetching={isRefetching} refetch={refetch} />
            </div>
        </div>
    );
}
