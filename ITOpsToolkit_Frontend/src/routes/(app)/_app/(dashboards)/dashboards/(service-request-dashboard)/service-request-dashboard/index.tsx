import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(service-request-dashboard)/service-request-dashboard/')({
    component: lazyRouteComponent(async () => {
        const ServiceRequestDashboardPage = await import('@/modules/service-request-dashboard/pages/ServiceRequestDashboardPage');
        return ServiceRequestDashboardPage;
    }),

    head: () => ({
        meta: [{ title: 'Service Request Dashboard | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Service request fulfilment throughput and backlog' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
