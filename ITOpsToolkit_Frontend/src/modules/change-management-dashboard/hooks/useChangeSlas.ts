import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchChangeSlas, type SlaRecord } from '../services/change-sla.service';

export type { SlaRecord };

export interface ChangeSlaResult {
    breached: number;
    atRisk: number;
    compliant: number;
    total: number;
    records: SlaRecord[];
}

export function useChangeSlas(
    filters?: {
        states?: number[];
        priorities?: number[];
        assignment_groups?: string[];
        assigned_to?: string;
        dateRange?: { start: string; end: string };
    },
    context?: 'me' | 'org',
    enabled = true,
) {
    const { getUserSnowDetails } = useAuth();

    return useQuery<SlaRecord[], Error, ChangeSlaResult>({
        queryKey: [
            'change-slas',
            JSON.stringify(filters?.states),
            JSON.stringify(filters?.priorities),
            JSON.stringify(filters?.assignment_groups),
            filters?.assigned_to,
            context,
            JSON.stringify(filters?.dateRange),
        ],
        queryFn: async () => {
            const filtersToApply = { ...filters };

            if (context === 'me') {
                const userSnowDetails = await getUserSnowDetails();
                filtersToApply.assigned_to = userSnowDetails.sys_id;
            }

            return fetchChangeSlas(filtersToApply);
        },
        enabled: enabled,
        select: (records) => {
            let breached = 0;
            let atRisk = 0;
            let compliant = 0;

            records.forEach((r) => {
                const pct = parseFloat(r.business_percentage?.value ?? '0');
                if (r.has_breached?.value === 'true') {
                    breached++;
                } else if (pct >= 75) {
                    atRisk++;
                } else {
                    compliant++;
                }
            });

            return { breached, atRisk, compliant, total: records.length, records };
        },
    });
}
