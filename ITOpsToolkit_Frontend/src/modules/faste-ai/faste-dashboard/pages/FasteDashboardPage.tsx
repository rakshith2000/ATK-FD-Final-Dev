import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useDashboardStats, type ChartFilter } from '../hooks/useDashboardStats';
import { useLiveTicketStream } from '../hooks/useLiveTicketStream';
import { useActiveTicketDetails } from '../hooks/useActiveTicketDetails';
import { KpiMetricsGrid } from '../components/ui/MetricCards/KpiMetricsGrid';
import { EscalationSubGrid } from '../components/smart/EscalationSubGrid/EscalationSubGrid';
import { AnalyticsChartsGrid } from '../components/smart/AnalyticsChartsGrid/AnalyticsChartsGrid';
import { TowerAnalysisSection } from '../components/ui/TowerAnalysisSection/TowerAnalysisSection';
import { DetailedCategoryReport } from '../components/smart/DetailedCategoryReport/DetailedCategoryReport';
import { FasteDashboardHeader } from '../components/smart/FasteDashboardHeader/FasteDashboardHeader';
import { FasteActiveTickets, type ExtendedTicket } from '../components/smart/FasteActiveTickets/FasteActiveTickets';
import { EmptyPlaceholder, ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { GridSkeleton } from '@/shared/components/ui/Skeletons';
import type { Ticket } from '../services/types';

interface LocationState {
    activeTab?: 'dashboard' | 'tickets';
}

const isResolved = (t: Ticket): boolean => String(t.resolved).toLowerCase() === 'true' || t.resolved === true;
const isEscalated = (t: Ticket): boolean => String(t.escalation_state).toLowerCase() === 'true' || t.escalation_state === true;

export const FasteDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as LocationState | undefined;

    const liveTicketNumbers = useLiveTicketStream();
    const initialTab = useMemo<'dashboard' | 'tickets'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam === 'tickets' || tabParam === 'dashboard') {
                return tabParam;
            }
        }
        return locationState?.activeTab || 'dashboard';
    }, [locationState]);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets'>(initialTab);
    const handleTabChange: React.Dispatch<React.SetStateAction<'dashboard' | 'tickets'>> = (value) => {
        setActiveTab((prevTab) => {
            const nextTab = typeof value === 'function' ? value(prevTab) : value;
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', nextTab);
                window.history.replaceState(window.history.state, '', url.toString());
            }
            return nextTab;
        });
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.get('tab') !== activeTab) {
                url.searchParams.set('tab', activeTab);
                window.history.replaceState(window.history.state, '', url.toString());
            }
        }
    }, [activeTab]);

    const [searchValue, setSearchValue] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState<'assigned-to-user' | 'assignment-group' | 'unassigned'>('assigned-to-user');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [filterOpen, setFilterOpen] = useState(false);

    const [rangeOverride, setRangeOverride] = useState<{ start: Date; end: Date } | null>(null);
    const [activeChartFilter, setActiveChartFilter] = useState<ChartFilter | null>(null);

    const currentRange = useMemo(() => {
        if (rangeOverride) return rangeOverride;

        const numericYear = parseInt(selectedYear, 10);
        if (isNaN(numericYear)) return null;
        return {
            start: new Date(numericYear, 0, 1, 0, 0, 0, 0),
            end: new Date(numericYear, 11, 31, 23, 59, 59, 999),
        };
    }, [selectedYear, rangeOverride]);

    const dashboardStatsResult = useDashboardStats(currentRange, liveTicketNumbers, activeChartFilter);
    const { stats, monthlySeries, tickets, activeTickets = [], isLoading, error } = dashboardStatsResult;

    const isRefetching = 'isRefetching' in dashboardStatsResult ? Boolean(dashboardStatsResult.isRefetching) : false;
    const refetch =
        'refetch' in dashboardStatsResult && typeof dashboardStatsResult.refetch === 'function' ? (dashboardStatsResult.refetch as () => void) : () => window.location.reload();

    const activeTicketNumbers = useMemo(() => activeTickets.map((t) => t.number).filter((num): num is string => Boolean(num)), [activeTickets]);

    const activeTicketDetails = useActiveTicketDetails(activeTicketNumbers);

    const enrichedActiveTickets = useMemo(() => {
        return activeTickets.map((ticket) => {
            const detail = activeTicketDetails[String(ticket.number || '').toUpperCase()];
            if (!detail) return ticket;

            const merged = { ...ticket };
            (Object.keys(detail) as Array<keyof typeof detail>).forEach((key) => {
                const value = detail[key];
                if (value && String(value).trim() !== '') {
                    (merged as Record<string, unknown>)[key] = value;
                }
            });
            return merged;
        });
    }, [activeTickets, activeTicketDetails]);

    const getBreakdown = (entry: unknown): Record<string, number> => {
        if (entry && typeof entry === 'object' && 'breakdown' in entry) {
            return (entry as { breakdown?: Record<string, number> }).breakdown ?? {};
        }
        return {};
    };

    const filteredActiveIncidents = useMemo(() => {
        let running = [...enrichedActiveTickets];

        if (searchValue.trim() !== '') {
            const targetStr = searchValue.toLowerCase();
            running = running.filter(
                (t) =>
                    String(t.number || '')
                        .toLowerCase()
                        .includes(targetStr) ||
                    String(t.short_description || '')
                        .toLowerCase()
                        .includes(targetStr),
            );
        }
        return running;
    }, [enrichedActiveTickets, searchValue]);

    const applyEscalationFilter = (type: string) => {
        setActiveChartFilter((prev) => {
            if (prev?.type === 'escalation' && prev.escalationType === type) {
                return null;
            }
            return {
                type: 'escalation',
                escalationType: type,
                label: `Escalation: ${type}`,
            };
        });
    };

    const handleNavigationMatrix = (actionKey: string, payloadTarget: string | null = null, categoryContext: string | null = null): void => {
        if (actionKey === 'current') {
            handleTabChange('tickets');
            return;
        }

        let dynamicTitle = 'Total Tickets';
        const filterType = 'all';

        if (actionKey === 'escalation_type' && payloadTarget) {
            dynamicTitle = categoryContext ? `${categoryContext} Escalation: ${payloadTarget}` : `Escalation: ${payloadTarget}`;
        } else if (actionKey === 'resolved') {
            dynamicTitle = 'Resolved Tickets';
        } else if (actionKey === 'escalated') {
            dynamicTitle = 'Escalated Tickets';
        } else if (actionKey === 'view_report_dispatch' && payloadTarget) {
            dynamicTitle = payloadTarget;
        }
        const filteredTickets =
            actionKey === 'escalation_type' && payloadTarget
                ? tickets.filter((t) => {
                      const cats = Array.isArray(t.escalation_category) ? t.escalation_category : [];
                      const matchTarget = payloadTarget.toLowerCase().trim();
                      const matchesEscalation = cats.some((c) => (c || '').toLowerCase().trim() === matchTarget);

                      const matchesCategory = categoryContext ? (t.dashboard_category || '').toLowerCase() === categoryContext.toLowerCase() : true;

                      return matchesEscalation && matchesCategory;
                  })
                : actionKey === 'view_report_dispatch' && payloadTarget
                  ? tickets.filter((t) => (t.dashboard_category || '').toLowerCase() === payloadTarget.toLowerCase())
                  : actionKey === 'resolved'
                    ? tickets.filter(isResolved)
                    : actionKey === 'escalated'
                      ? tickets.filter(isEscalated)
                      : tickets;

        const routingMockCategory = {
            title: dynamicTitle,
            measures: getMeasures(actionKey === 'view_report_dispatch' ? (payloadTarget ?? 'Others') : 'Others'),
            ticketsByCategory: { All: filteredTickets },
            stats: {
                raised: filteredTickets.length,
                resolved: filteredTickets.filter(isResolved).length,
                escalated: filteredTickets.filter(isEscalated).length,
                active: filteredTickets.filter((t) => !isResolved(t)).length,
                breakdown: getBreakdown(actionKey === 'view_report_dispatch' && payloadTarget ? stats?.[payloadTarget] : stats?.overall),
            },
        };

        void navigate({
            to: '/faste-ai/faste-dashboard/analysis',
            state: (prev) => ({
                ...prev,
                category: routingMockCategory,
                allTickets: filteredTickets,
                initialFilter: filterType,
            }),
        });
    };

    const getMeasures = (name: string): string[] => {
        const config: Record<string, string[]> = {
            Windows: [
                'High disk utilization and memory issues observed',
                'Windows service failures requiring restart procedures',
                'Authentication and access control issues resolved',
            ],
            Linux: ['SSH access and permission-related issues identified', 'Disk space and filesystem utilization problems', 'Service downtime and kernel-related incidents'],
            Network: ['Connectivity issues affecting multiple services', 'VPN and firewall configuration problems', 'DNS resolution and network latency issues'],
            Database: ['Connection timeout and query performance issues', 'Backup failures and replication lag problems', 'Access control and deadlock situations'],
            Cloud: ['Instance startup and auto-scaling failures', 'IAM access and security group misconfigurations', 'API timeout and storage quota issues'],
            Others: ['Uncategorized incidents requiring classification', 'Issues pending proper categorization', 'Miscellaneous system-related problems'],
        };
        return config[name] ?? ['General diagnostic evaluation metric evaluation processes running.'];
    };

    const targetTowers = ['Windows', 'Linux', 'Network', 'Database', 'Cloud', 'Others'];

    const formattedTowerSeries = targetTowers.map((name) => ({
        name,
        raised: (stats?.[name] as { raised?: number })?.raised ?? 0,
        resolved: (stats?.[name] as { resolved?: number })?.resolved ?? 0,
        escalated: (stats?.[name] as { escalated?: number })?.escalated ?? 0,
    }));

    const detailedReportPayload = targetTowers.map((name) => ({
        title: name,
        measures: getMeasures(name),
        stats: {
            raised: (stats?.[name] as { raised?: number })?.raised ?? 0,
            resolved: (stats?.[name] as { resolved?: number })?.resolved ?? 0,
            escalated: (stats?.[name] as { escalated?: number })?.escalated ?? 0,
            breakdown: getBreakdown(stats?.[name]),
        },
    }));

    return (
        <div className="w-full flex flex-col h-full max-h-screen p-3 overflow-hidden">
            <FasteDashboardHeader
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                assignmentFilter={assignmentFilter}
                setAssignmentFilter={setAssignmentFilter}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                onFilterChange={(filterObj) => {
                    if (filterObj.mode === 'all' || !filterObj.start || !filterObj.end) {
                        setRangeOverride(null);
                    } else {
                        setRangeOverride({ start: filterObj.start, end: filterObj.end });
                    }
                }}
            />

            <div className="w-full h-[calc(100vh-160px)] overflow-y-scroll space-y-2.5 pt-0 pr-1 pb-12">
                {isLoading ? (
                    <div className="border border-gray-50 bg-white rounded-xl p-2">
                        <GridSkeleton GAP={4} rows={1} cols={5} VW={1200} />
                    </div>
                ) : null}

                {error || (!isLoading && !stats?.overall) ? (
                    <div className="border border-gray-50 bg-white rounded-xl p-5">
                        <ErrorPlaceholder iconSize={100} error={error} onRetry={refetch} />
                    </div>
                ) : null}

                {!isLoading && !error && stats?.overall && (
                    <>
                        {activeTab === 'dashboard' ? (
                            <>
                                <KpiMetricsGrid
                                    items={[
                                        { key: 'total', label: 'Total Tickets', value: stats.overall.total },
                                        { key: 'resolved', label: 'Resolved Tickets', value: stats.overall.resolved },
                                        { key: 'escalated', label: 'Escalated Tickets', value: stats.overall.escalated },
                                        { key: 'current', label: 'Active Tickets', value: stats.overall.active },
                                    ]}
                                    onItemClick={(key) => handleNavigationMatrix(key)}
                                />

                                <EscalationSubGrid breakdown={stats.overall.escalationBreakdown} onItemClick={(type) => applyEscalationFilter(type)} />

                                {activeChartFilter && (
                                    <div className="flex justify-end mb-0.5">
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-blue-200 rounded-full shadow-xs text-xs font-bold text-[#011A80]">
                                            <span>Filtered by {activeChartFilter.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => setActiveChartFilter(null)}
                                                className="text-slate-400 hover:text-slate-600 transition-colors p-0 bg-transparent border-0 cursor-pointer"
                                                title="Clear filter"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <AnalyticsChartsGrid
                                    series={monthlySeries}
                                    escalationBreakdown={stats.overall.escalationBreakdown}
                                    escalationTotal={stats.overall.escalated}
                                    onEscalationItemClick={(type) => applyEscalationFilter(type)}
                                />

                                <TowerAnalysisSection towerData={formattedTowerSeries} onTowerClick={(name) => handleNavigationMatrix('view_report_dispatch', name)} />

                                <DetailedCategoryReport
                                    categoryAnalysis={detailedReportPayload}
                                    onCategoryCardClick={(category) => handleNavigationMatrix('view_report_dispatch', category.title)}
                                    handleKPIClick={(action, type, context) => {
                                        if (action === 'escalation_type') {
                                            applyEscalationFilter(type);
                                        } else {
                                            handleNavigationMatrix(action, type, context);
                                        }
                                    }}
                                />
                            </>
                        ) : (
                            <div>
                                {filteredActiveIncidents.length === 0 ? (
                                    <EmptyPlaceholder message="No Active Tickets found !" isRefetching={isRefetching} onRetry={refetch} />
                                ) : (
                                    <FasteActiveTickets
                                        incidentData={filteredActiveIncidents as ExtendedTicket[]}
                                        loginUserSysId="preferred_username"
                                        loginDetails={{ currentuserDetails: { name: 'IT Operations Peer' } }}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FasteDashboardPage;
