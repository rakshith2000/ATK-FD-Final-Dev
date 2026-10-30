import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(problem-dashboard)/problem-dashboard/')({
    component: lazyRouteComponent(async () => {
        const ProblemDashboardPage = await import('@/modules/problem-dashboard/pages/ProblemDashboardPage');
        return ProblemDashboardPage;
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
