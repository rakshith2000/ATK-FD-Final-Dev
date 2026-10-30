import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(problem-dashboard)/problem-dashboard')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Problem Dashboard' } },
    head: () => ({
        meta: [{ title: 'Problem Dashboard | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Problem records and RCA progress' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
