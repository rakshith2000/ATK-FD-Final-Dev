import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
export const Route = createFileRoute('/(app)/_app')({
    head: () => ({
        meta: [{ title: 'Autonomous ITOps Toolkit' }, { name: 'description', content: 'Autonomous ITOps Toolkit application' }],
    }),
    component: lazyRouteComponent(async () => import('../../AppLayout')),
    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
