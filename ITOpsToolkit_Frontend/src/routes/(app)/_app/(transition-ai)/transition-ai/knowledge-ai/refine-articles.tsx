import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/knowledge-ai/refine-articles')({
    component: lazyRouteComponent(async () => {
        const RefineArticlesPage = await import('@/modules/knowledge-ai/pages/RefineArticlesPage');
        return RefineArticlesPage;
    }),

    staticData: {
        crumb: {
            label: 'Refine Articles',
        },
    },

    head: () => ({
        meta: [{ title: 'Refine Low Scoring Articles | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Refine low-scoring knowledge base articles' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
