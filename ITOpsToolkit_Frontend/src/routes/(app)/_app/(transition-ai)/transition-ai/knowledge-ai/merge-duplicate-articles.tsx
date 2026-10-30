import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/knowledge-ai/merge-duplicate-articles')({
    component: lazyRouteComponent(async () => {
        const MergeDuplicateArticlesPage = await import('@/modules/knowledge-ai/pages/MergeDuplicateArticlesPage');
        return MergeDuplicateArticlesPage;
    }),

    staticData: {
        crumb: {
            label: 'Merge Duplicate Articles',
        },
    },

    head: () => ({
        meta: [{ title: 'Merge Duplicate Articles | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Merge duplicate knowledge base articles' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
