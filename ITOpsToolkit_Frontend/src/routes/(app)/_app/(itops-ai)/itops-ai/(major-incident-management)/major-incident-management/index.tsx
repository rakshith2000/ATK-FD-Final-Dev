import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/(major-incident-management)/major-incident-management/')({
    component: lazyRouteComponent(async () => {
        const MIMDashboardPage = await import('@/modules/major-incident-management/pages/MIMDashboardPage');
        return MIMDashboardPage;
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
