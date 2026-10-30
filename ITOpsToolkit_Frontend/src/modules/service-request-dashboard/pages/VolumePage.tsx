import { useMemo } from 'react';
import type { SCRequestStatsResult } from '../hooks/useSCRequestStatsByPriorityAndGroupByState';
import { DashboardCard, DashboardCardHead } from '@/shared/modules/dashboard/components/ui/DashboardCard/DashboardCard';
import { DashboardTrendChart } from '@/shared/modules/dashboard/components/ui/DashboardTrendChart/DashboardTrendChart';
import { DashboardHeatmap, type HeatmapRow } from '@/shared/modules/dashboard/components/ui/DashboardHeatmap/DashboardHeatmap';
import { DashboardAgingBars, type AgingBucket } from '@/shared/modules/dashboard/components/ui/DashboardAgingBars/DashboardAgingBars';
import { DashboardGroupStackChart, type GroupStackData } from '@/shared/modules/dashboard/components/ui/DashboardGroupStackChart/DashboardGroupStackChart';
import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';

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

function formatDateLabel(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface VolumePageProps {
    data: SCRequestStatsResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}

export function VolumePage({ data, isLoading, isError, error, refetch }: VolumePageProps) {
    const rawRequests = data?.raw_sc_requests ?? [];

    /* ── Volume trend: group by creation date ── */
    const trendData = useMemo(() => {
        if (rawRequests.length === 0) return [];

        const createdMap: Record<string, number> = {};
        const updatedMap: Record<string, number> = {};

        rawRequests.forEach((c) => {
            const createdDate = parseDate(c.sys_created_on);
            if (createdDate) {
                const key = createdDate.toISOString().slice(0, 10);
                createdMap[key] = (createdMap[key] ?? 0) + 1;
            }
            const updatedDate = parseDate(c.sys_updated_on);
            if (updatedDate) {
                const key = updatedDate.toISOString().slice(0, 10);
                updatedMap[key] = (updatedMap[key] ?? 0) + 1;
            }
        });

        const allDates = Array.from(new Set([...Object.keys(createdMap), ...Object.keys(updatedMap)])).sort();

        return allDates.map((dateKey) => ({
            label: formatDateLabel(new Date(dateKey)),
            created: createdMap[dateKey] ?? 0,
            updated: updatedMap[dateKey] ?? 0,
        }));
    }, [rawRequests]);

    /* ── Heatmap: assignment group × priority ── */
    const { heatmapRows, heatmapMax } = useMemo(() => {
        const groupMap: Record<string, Record<string, number>> = {};

        rawRequests.forEach((c) => {
            const group = c.assignment_group?.display_value || 'Unknown';
            const prio = c.priority?.value || '0';
            if (!groupMap[group]) groupMap[group] = {};
            groupMap[group][prio] = (groupMap[group][prio] ?? 0) + 1;
        });

        const rows: HeatmapRow[] = Object.entries(groupMap)
            .map(([group, counts]) => ({
                group,
                counts,
                total: Object.values(counts).reduce((a, b) => a + b, 0),
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 12);

        const max = Math.max(1, ...rows.flatMap((r) => Object.values(r.counts)));
        return { heatmapRows: rows, heatmapMax: max };
    }, [rawRequests]);

    /* ── Aging buckets: by sys_created_on ── */
    const agingBuckets = useMemo((): AgingBucket[] => {
        const buckets: AgingBucket[] = [
            { label: '< 3 days', count: 0, tone: 'good' },
            { label: '3 – 7 days', count: 0, tone: 'warning' },
            { label: '7 – 14 days', count: 0, tone: 'serious' },
            { label: '> 14 days', count: 0, tone: 'critical' },
        ];

        const now = Date.now();
        rawRequests.forEach((c) => {
            const d = parseDate(c.sys_created_on);
            if (!d) return;
            const ageDays = (now - d.getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays < 3) buckets[0].count++;
            else if (ageDays < 7) buckets[1].count++;
            else if (ageDays < 14) buckets[2].count++;
            else buckets[3].count++;
        });

        return buckets;
    }, [rawRequests]);

    /* ── Top groups stack data ── */
    const topGroupsData = useMemo((): GroupStackData[] => {
        const groupMap: Record<string, Record<string, number>> = {};

        rawRequests.forEach((c) => {
            const group = c.assignment_group?.display_value || 'Unknown';
            const prio = c.priority?.value || '0';
            if (!groupMap[group]) groupMap[group] = {};
            groupMap[group][prio] = (groupMap[group][prio] ?? 0) + 1;
        });

        return Object.entries(groupMap)
            .map(([group, priorities]) => ({
                group,
                priorities,
                total: Object.values(priorities).reduce((a, b) => a + b, 0),
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [rawRequests]);

    const backlogTotal = agingBuckets.reduce((s, b) => s + b.count, 0);

    if (isLoading) {
        return (
            <div className="p-5">
                <GridSkeleton GAP={4} rows={2} cols={2} VW={1200} />
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

    if ((data?.total_count ?? 0) === 0) {
        return (
            <div className="p-5">
                <EmptyPlaceholder message="No service requests found for the selected filters." />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-5 min-h-full">
            {/* ── Section: Volume & Workload ── */}
            <div className="db-section">
                <SectionTitle title="Volume & Workload" desc="Fulfillment velocity · team leads" />
                <div className="db-grid cols-2">
                    {/* Volume Trend — full width */}
                    <DashboardCard className="span-full db-panel">
                        <DashboardCardHead title="Created vs Active (Updated)" subtitle="Inbound request volume against active fulfillment — grouped by date" />
                        <div className="db-card-body">
                            {trendData.length > 0 ? <DashboardTrendChart data={trendData} /> : <EmptyPlaceholder message="No dated activity in this range." />}
                        </div>
                    </DashboardCard>

                    {/* Heatmap */}
                    <DashboardCard>
                        <DashboardCardHead title="Workload Distribution" subtitle="Open requests · assignment group × priority" />
                        <div className="db-card-body">
                            <DashboardHeatmap rows={heatmapRows} max={heatmapMax} priorities={['1', '2', '3', '4', '5']} />
                        </div>
                    </DashboardCard>

                    {/* Aging */}
                    <DashboardCard>
                        <DashboardCardHead title="Service Request Backlog by Age" subtitle={`${backlogTotal} requests · target stagnant tickets before SLA breach`} />
                        <div className="db-card-body">
                            {backlogTotal > 0 ? <DashboardAgingBars buckets={agingBuckets} /> : <EmptyPlaceholder message="No requests to display." />}
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {/* ── Section: Top Groups ── */}
            <div className="db-section">
                <SectionTitle title="Top Groups by Request Volume" desc="Assignment groups with the most open service requests, stacked by priority" />
                <DashboardCard className="db-panel">
                    <DashboardCardHead title="Top Assignment Groups" subtitle="Requests in period, stacked by priority — pinpoints busiest fulfillment teams" />
                    <div className="db-card-body">
                        {topGroupsData.length > 0 ? <DashboardGroupStackChart data={topGroupsData} /> : <EmptyPlaceholder message="No group data available." />}
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}
