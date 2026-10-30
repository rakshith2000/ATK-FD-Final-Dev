import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(service-request-dashboard)/service-request-dashboard')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Service Request Dashboard' } },
    head: () => ({
        meta: [{ title: 'Service Request Dashboard | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Service request fulfilment throughput and backlog' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
