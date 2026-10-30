import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(incident-dashboard)/incident-dashboard')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Incident Dashboard' } },
    head: () => ({
        meta: [{ title: 'Incident Dashboard | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Incident volume, priority and state analytics' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
