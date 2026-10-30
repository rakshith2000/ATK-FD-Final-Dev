import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(incident-dashboard)/incident-dashboard/')({
    component: lazyRouteComponent(async () => {
        const IncidentDashboardPage = await import('@/modules/incident-management-dashboard/pages/IncidentDashboardPage');
        return IncidentDashboardPage;
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
