import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import { DashboardAlertBanner } from '@/shared/modules/dashboard/components/ui/DashboardAlertBanner/DashboardAlertBanner';

interface ChangeAlertBannerProps {
    count: number;
    changes: SnowTicket[];
}

export function ChangeAlertBanner({ count, changes }: ChangeAlertBannerProps) {
    return (
        <DashboardAlertBanner
            count={count}
            items={changes.slice(0, 3).map((c) => ({
                id: c.sys_id?.value || c.number?.display_value || '',
                tag: c.type?.display_value?.slice(0, 3).toUpperCase() ?? 'CHG',
                label: `${c.number?.display_value} · ${c.short_description?.display_value || 'No description'}`,
            }))}
            title="Emergency / Expedited Changes"
            subtitle="Changes requiring immediate attention"
            activeBadgeText="Active"
            clearBadgeText="All clear"
            emptyText="No emergency or expedited changes active."
        />
    );
}
