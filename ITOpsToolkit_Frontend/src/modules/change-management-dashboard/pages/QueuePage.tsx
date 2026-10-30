import { useMemo } from 'react';
import { Activity, Layers, AlertOctagon, AlertTriangle, Minus, ArrowDown, XCircle, Clock, CheckCircle, FileText, Search, ShieldCheck, Calendar, Play, Eye } from 'lucide-react';
import type { StatCardVariant } from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import type { ChangeStatsResult } from '../hooks/useChangeStatsByPriorityAndGroupByState';
import type { ChangeSlaResult } from '../hooks/useChangeSlas';
import StatCard from '@/shared/modules/dashboard/components/ui/StatCard/StatCard';
import ChangesTable from '../components/smart/ChangesTable/ChangesTable';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
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

const DEFAULT_STATE_CONFIG: { value: string; defaultLabel: string; desc: string; variant: StatCardVariant; icon: React.ReactNode }[] = [
    { value: '-5', defaultLabel: 'New', desc: 'Initial creation', variant: 'navy', icon: <FileText size={20} /> },
    { value: '-4', defaultLabel: 'Assess', desc: 'Under review', variant: 'blue', icon: <Search size={20} /> },
    { value: '-3', defaultLabel: 'Authorize', desc: 'Approved to proceed', variant: 'sky', icon: <ShieldCheck size={20} /> },
    { value: '-2', defaultLabel: 'Scheduled', desc: 'Awaiting window', variant: 'light', icon: <Calendar size={20} /> },
    { value: '-1', defaultLabel: 'Implement', desc: 'Currently executing', variant: 'navy', icon: <Play size={20} /> },
    { value: '0', defaultLabel: 'Review', desc: 'Post-implementation', variant: 'blue', icon: <Eye size={20} /> },
];

const PRIORITY_CARDS = [
    { value: '1', label: 'Critical (P1)', variant: 'navy' as const, icon: <AlertOctagon size={20} /> },
    { value: '2', label: 'High (P2)', variant: 'blue' as const, icon: <AlertTriangle size={20} /> },
    { value: '3', label: 'Moderate (P3)', variant: 'sky' as const, icon: <Minus size={20} /> },
    { value: '4', label: 'Low (P4)', variant: 'light' as const, icon: <ArrowDown size={20} /> },
];

function isEmergency(c: Record<string, { value: string | null; display_value: string | null }>): boolean {
    const t = (c.type?.display_value ?? '').toLowerCase();
    const v = (c.type?.value ?? '').toLowerCase();
    return t.includes('emergency') || t.includes('expedit') || v.includes('emergency') || v.includes('expedit');
}

function isNormal(c: Record<string, { value: string | null; display_value: string | null }>): boolean {
    const t = (c.type?.display_value ?? '').toLowerCase();
    const v = (c.type?.value ?? '').toLowerCase();
    return t.includes('normal') || v.includes('normal');
}

function isStandard(c: Record<string, { value: string | null; display_value: string | null }>): boolean {
    const t = (c.type?.display_value ?? '').toLowerCase();
    const v = (c.type?.value ?? '').toLowerCase();
    return t.includes('standard') || v.includes('standard');
}

/* ─────────────────────────── component ────────────────────────── */

export interface QueuePageProps {
    data: ChangeStatsResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    isRefetching: boolean;
    selectedDrilldownState: string | null;
    selectedDrilldownGroup: string | null;
    slaData?: ChangeSlaResult;
    stateOptions?: Array<{ label: string; value: string }>;
}

export function QueuePage({ data, isLoading, isError, error, refetch, isRefetching, selectedDrilldownState, selectedDrilldownGroup, slaData, stateOptions }: QueuePageProps) {
    const rawChanges = data?.raw_changes ?? [];

    const stateQueueCards = useMemo(() => {
        return DEFAULT_STATE_CONFIG.map((s) => {
            const matchedOption = stateOptions?.find((opt) => String(opt.value) === String(s.value));
            return {
                ...s,
                label: matchedOption?.label || s.defaultLabel,
            };
        });
    }, [stateOptions]);

    /* ── drilldown-filtered rows for the table ── */
    const tableData = useMemo(() => {
        if (!selectedDrilldownState && !selectedDrilldownGroup) return rawChanges;
        return rawChanges.filter((chg) => {
            const matchesState = !selectedDrilldownState || chg.state?.value === selectedDrilldownState;
            const matchesGroup = !selectedDrilldownGroup || chg.assignment_group?.value === selectedDrilldownGroup;
            return matchesState && matchesGroup;
        });
    }, [rawChanges, selectedDrilldownState, selectedDrilldownGroup]);

    /* ── derived metrics ── */
    const stateMap = useMemo(() => Object.fromEntries((data?.state_stats ?? []).map((s) => [s.value, s.count])), [data?.state_stats]);

    const priorityMap = useMemo(() => Object.fromEntries((data?.priority_stats ?? []).map((p) => [p.value, p.count])), [data?.priority_stats]);

    const normalChanges = useMemo(() => rawChanges.filter(isNormal), [rawChanges]);
    const standardChanges = useMemo(() => rawChanges.filter(isStandard), [rawChanges]);
    const emergencyChanges = useMemo(() => rawChanges.filter(isEmergency), [rawChanges]);

    const activePhaseCount = (stateMap['-1'] ?? 0) + (stateMap['0'] ?? 0);
    const totalCount = data?.total_count ?? 0;

    const tableHeight = useMemo(() => {
        if (isLoading) return 380;
        if (tableData.length === 0) return 240;
        // Toolbar (~44px) + Header (~38px) + ~38px per record + container padding
        const calculated = 92 + tableData.length * 38;
        return Math.min(560, Math.max(calculated, 180));
    }, [isLoading, tableData.length]);

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

    return (
        <div className="flex flex-col gap-1 p-5 pt-2 min-h-full">
            {/* ── Section 1: Change overview ── */}
            <div className="db-section">
                <SectionTitle title="Change Overview" desc="By type and operational status" />
                <div className="db-grid cols-5">
                    <StatCard
                        title="Emergency"
                        value={emergencyChanges.length}
                        variant={emergencyChanges.length > 0 ? 'alert' : 'alert-text'}
                        icon={<AlertOctagon size={20} />}
                        subtitle={totalCount > 0 ? `${Math.round((emergencyChanges.length / totalCount) * 100)}% of total` : undefined}
                    />
                    <StatCard
                        title="Normal"
                        value={normalChanges.length}
                        variant="sky"
                        icon={<FileText size={20} />}
                        subtitle={totalCount > 0 ? `${Math.round((normalChanges.length / totalCount) * 100)}% of total` : undefined}
                    />
                    <StatCard
                        title="Standard"
                        value={standardChanges.length}
                        variant="blue"
                        icon={<ShieldCheck size={20} />}
                        subtitle={totalCount > 0 ? `${Math.round((standardChanges.length / totalCount) * 100)}% of total` : undefined}
                    />

                    <StatCard title="In Active Phase" value={activePhaseCount} variant="navy" icon={<Activity size={20} />} subtitle="Implement + Review stages" />
                    <StatCard title="Total Changes" value={totalCount} variant="light" icon={<Layers size={20} />} subtitle="in selected period & filters" />
                </div>
            </div>

            {/* ── Section 2: Change queue ── */}
            <div className="db-section">
                <SectionTitle title="Change Queue" desc="Lifecycle stage distribution" />
                <div className="db-grid cols-6">
                    {stateQueueCards.map((s) => (
                        <StatCard key={s.value} title={s.label} value={stateMap[s.value] ?? 0} variant={s.variant} icon={s.icon} subtitle={s.desc} />
                    ))}
                </div>
            </div>

            {/* ── Section 3: Priority breakdown ── */}
            <div className="db-section">
                <SectionTitle title="Changes by Priority" desc="Severity mix of current changes" />
                <div className="db-grid cols-4">
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

            {/* ── Section 4: SLA Health ── */}
            {slaData && slaData.total > 0 && (
                <div className="db-section">
                    <SectionTitle title="SLA Health" desc={`${slaData.total} active SLA records`} />
                    <div className="db-grid cols-3">
                        <StatCard
                            title="Breached"
                            value={slaData.breached}
                            variant="navy"
                            icon={<XCircle size={20} />}
                            subtitle={`${slaData.total > 0 ? Math.round((slaData.breached / slaData.total) * 100) : 0}% of SLAs`}
                        />
                        <StatCard
                            title="At Risk (≥ 75%)"
                            value={slaData.atRisk}
                            variant="sky"
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

            {/* ── Section 5: Changes table ── */}
            <div
                className="rounded-[14px] border border-[rgba(20,50,110,0.12)] overflow-hidden transition-all duration-200"
                style={{
                    height: `${tableHeight}px`,
                    boxShadow: '0 1px 2px rgba(20,50,110,0.05), 0 8px 24px rgba(20,50,110,0.08)',
                }}
            >
                <ChangesTable data={tableData} isLoading={isLoading} isError={isError} error={error} isRefetching={isRefetching} refetch={refetch} />
            </div>
        </div>
    );
}
