import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/knowledge-ai/')({
    component: lazyRouteComponent(async () => {
        const KnowledgeAIPage = await import('@/modules/knowledge-ai/pages/KnowledgeAIPage');
        return KnowledgeAIPage;
    }),

    staticData: {
        crumb: {
            label: 'Knowledge AI',
        },
    },

    head: () => ({
        meta: [{ title: 'Knowledge AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered knowledge base article generation and management' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
