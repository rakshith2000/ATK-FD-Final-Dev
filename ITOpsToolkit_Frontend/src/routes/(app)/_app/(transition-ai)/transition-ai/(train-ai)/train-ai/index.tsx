import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/(train-ai)/train-ai/')({
    component: lazyRouteComponent(async () => {
        const TrainAiDashboardPage = await import('@/modules/train-ai/pages/TrainAiDashboardPage');
        return TrainAiDashboardPage;
    }),

    staticData: {
        crumb: {
            label: 'Train AI Dashboard',
        },
    },

    head: () => ({
        meta: [{ title: 'Train AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered training dashboard and learning progress' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
