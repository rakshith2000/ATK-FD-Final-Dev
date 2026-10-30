import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchOperationalLogs } from '../services/fetch-logs';
import { ESCALATION_METRICS_SCHEMA } from '../services/types';
import type { Ticket } from '../services/types';

export interface ChartFilter {
    type: 'status' | 'escalation' | 'month_status';
    status?: 'all' | 'resolved' | 'escalated';
    escalationType?: string;
    monthKey?: string;
    label: string;
}

interface DashboardCategoryStats {
    raised: number;
    resolved: number;
    escalated: number;
    active: number;
    total: number;
    breakdown: Record<string, number>;
}

interface DashboardOverallStats {
    total: number;
    raised: number;
    resolved: number;
    escalated: number;
    active: number;
    escalationBreakdown: Record<string, number>;
}

export interface DashboardStats {
    overall: DashboardOverallStats;
    [categoryKey: string]: DashboardCategoryStats | DashboardOverallStats;
}

const isResolved = (t: Ticket): boolean => String(t.resolved).toLowerCase() === 'true' || t.resolved === true;
const isEscalated = (t: Ticket): boolean => String(t.escalation_state).toLowerCase() === 'true' || t.escalation_state === true;

const escalationMatch = (ticket: Ticket, type: string): boolean => {
    const cats = Array.isArray(ticket.escalation_category) ? ticket.escalation_category : [];
    const target = type.toLowerCase().trim();
    return cats.some((c: string) => (c || '').toLowerCase().trim() === target);
};

export const useDashboardStats = (dateRange: { start: Date; end: Date } | null, liveTicketNumbers: string[], activeChartFilter: ChartFilter | null = null) => {
    const {
        data: rawTickets = [],
        isLoading,
        error,
    } = useQuery<Ticket[]>({
        queryKey: ['fasteai-logs'],
        queryFn: fetchOperationalLogs,
        refetchInterval: 15000,
    });

    // 1. Date Range Filtering
    const dateFilteredTickets = useMemo(() => {
        if (!dateRange) return rawTickets;
        return rawTickets.filter((t) => {
            if (!t.created_on) return true;
            const createdDate = new Date(t.created_on);
            return createdDate >= dateRange.start && createdDate <= dateRange.end;
        });
    }, [rawTickets, dateRange]);

    // 2. Active In-Page Interactive Filter (Legacy parity)
    const chartFilteredTickets = useMemo(() => {
        if (!activeChartFilter) return dateFilteredTickets;

        if (activeChartFilter.type === 'escalation' && activeChartFilter.escalationType) {
            return dateFilteredTickets.filter((t) => escalationMatch(t, activeChartFilter.escalationType!));
        }

        if (activeChartFilter.type === 'status') {
            if (activeChartFilter.status === 'resolved') return dateFilteredTickets.filter(isResolved);
            if (activeChartFilter.status === 'escalated') return dateFilteredTickets.filter(isEscalated);
        }

        if (activeChartFilter.type === 'month_status' && activeChartFilter.monthKey) {
            const monthTickets = dateFilteredTickets.filter((t) => {
                if (!t.created_on) return false;
                const d = new Date(t.created_on);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return key === activeChartFilter.monthKey;
            });

            if (activeChartFilter.status === 'resolved') return monthTickets.filter(isResolved);
            if (activeChartFilter.status === 'escalated') return monthTickets.filter(isEscalated);
            return monthTickets;
        }

        return dateFilteredTickets;
    }, [dateFilteredTickets, activeChartFilter]);

    // 3. Active Tickets Lookup
    const activeTicketsLookup = useMemo(() => {
        const finishedStates = ['close complete', 'close incomplete', 'resolved', 'closed skipped'];
        const sanitizedLiveNumbers = liveTicketNumbers.map((num) => String(num).trim().toLowerCase());

        const matchedTickets: Ticket[] = [];

        sanitizedLiveNumbers.forEach((liveNum) => {
            if (!liveNum) return;

            const foundTicket = rawTickets.find((t) => {
                const possibleIdentifiers = [
                    t.number,
                    t.ticket_id,
                    t.id,
                    (t as unknown as Record<string, unknown>).incident_number,
                    (t as unknown as Record<string, unknown>).ticket_number,
                ];

                return possibleIdentifiers.some((id) => id !== undefined && id !== null && String(id).trim().toLowerCase() === liveNum);
            });

            if (foundTicket) {
                const categoryState = (foundTicket.ticket_category || '').toLowerCase().trim();
                const isFinishedState = finishedStates.includes(categoryState);
                if (!isFinishedState) {
                    matchedTickets.push(foundTicket);
                }
            } else {
                const fallbackTicket: Ticket = {
                    number: liveNum.toUpperCase(),
                    id: liveNum,
                    ticket_id: liveNum,
                    short_description: '',
                    description: '',
                    assigned_to: '',
                    assignment_group: '',
                    priority: '',
                    resolved: false,
                    escalation_state: false,
                    created_on: new Date().toISOString(),
                };
                matchedTickets.push(fallbackTicket);
            }
        });

        return matchedTickets;
    }, [rawTickets, liveTicketNumbers]);

    // 4. Aggregated Stats Computation
    const stats = useMemo((): DashboardStats => {
        const categories = ['Windows', 'Linux', 'Network', 'Database', 'Cloud', 'Others'];
        const computedStats: Record<string, DashboardCategoryStats | DashboardOverallStats> = {};

        categories.forEach((category) => {
            const categoryTickets = chartFilteredTickets.filter((t) => (t.dashboard_category || '').toLowerCase().trim() === category.toLowerCase());
            const categoryActiveTickets = activeTicketsLookup.filter((t) => (t.dashboard_category || 'others').toLowerCase().trim() === category.toLowerCase());

            const categoryBreakdown: Record<string, number> = {};
            ESCALATION_METRICS_SCHEMA.forEach((item) => {
                categoryBreakdown[item.key] = categoryTickets.filter((t) => escalationMatch(t, item.key)).length;
            });

            computedStats[category] = {
                raised: categoryTickets.length,
                resolved: categoryTickets.filter(isResolved).length,
                escalated: categoryTickets.filter(isEscalated).length,
                active: categoryActiveTickets.length,
                total: categoryTickets.length,
                breakdown: categoryBreakdown,
            };
        });

        const totalEscalated = chartFilteredTickets.filter(isEscalated).length;
        const totalResolved = chartFilteredTickets.filter(isResolved).length;

        const escalationBreakdown: Record<string, number> = {};
        ESCALATION_METRICS_SCHEMA.forEach((item) => {
            escalationBreakdown[item.key] = chartFilteredTickets.filter((t) => escalationMatch(t, item.key)).length;
        });

        computedStats.overall = {
            total: chartFilteredTickets.length,
            raised: chartFilteredTickets.length,
            resolved: totalResolved,
            escalated: totalEscalated,
            active: activeTicketsLookup.length,
            escalationBreakdown,
        };

        return computedStats as DashboardStats;
    }, [chartFilteredTickets, activeTicketsLookup]);

    // 5. Monthly Series Computation
    const monthlySeries = useMemo(() => {
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthMap: Record<string, { raised: number; resolved: number; escalated: number }> = {};

        chartFilteredTickets.forEach((ticket) => {
            if (!ticket.created_on) return;
            try {
                const d = new Date(ticket.created_on);
                if (isNaN(d.getTime())) return;
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!monthMap[key]) {
                    monthMap[key] = { raised: 0, resolved: 0, escalated: 0 };
                }

                monthMap[key].raised++;
                if (isResolved(ticket)) monthMap[key].resolved++;
                if (isEscalated(ticket)) monthMap[key].escalated++;
            } catch {}
        });

        const keys = Object.keys(monthMap).sort().slice(-6);
        return {
            labels: keys.map((k) => {
                const [yr, mo] = k.split('-');
                const monthIndex = parseInt(mo, 10) - 1;
                return `${MONTH_NAMES[monthIndex]} ${yr}`;
            }),
            raised: keys.map((k) => monthMap[k]?.raised ?? 0),
            resolved: keys.map((k) => monthMap[k]?.resolved ?? 0),
            escalated: keys.map((k) => monthMap[k]?.escalated ?? 0),
        };
    }, [chartFilteredTickets]);

    return {
        stats,
        monthlySeries,
        tickets: chartFilteredTickets,
        unfilteredTickets: dateFilteredTickets,
        activeTickets: activeTicketsLookup,
        isLoading,
        error,
    };
};
