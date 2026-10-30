import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/(train-ai)/train-ai/train-history')({
    component: lazyRouteComponent(async () => {
        const TrainHistoryPage = await import('@/modules/train-ai/pages/TrainHistoryPage');
        return TrainHistoryPage;
    }),
    staticData: {
        crumb: {
            label: 'Train History',
        },
    },

    head: () => ({
        meta: [{ title: 'Train History | Autonomous ITOps Toolkit' }, { name: 'description', content: 'View and manage your AI training sessions and history' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
