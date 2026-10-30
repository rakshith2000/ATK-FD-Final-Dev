import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(change-dashboard)/change-dashboard')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Change Dashboard' } },
    head: () => ({
        meta: [{ title: 'Change Dashboard | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Change volume, risk and implementation windows' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
