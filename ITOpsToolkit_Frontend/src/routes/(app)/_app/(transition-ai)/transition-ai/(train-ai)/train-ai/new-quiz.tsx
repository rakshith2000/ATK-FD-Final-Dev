import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/(train-ai)/train-ai/new-quiz')({
    validateSearch: (search: Record<string, unknown>) => ({
        resume: typeof search.resume === 'string' ? search.resume : undefined,
    }),
    component: lazyRouteComponent(async () => {
        const NewQuizPage = await import('@/modules/train-ai/pages/NewQuizPage');
        return NewQuizPage;
    }),
    staticData: {
        crumb: {
            label: 'New Quiz',
        },
    },
    head: () => ({
        meta: [{ title: 'New Quiz | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Start a new AI-powered quiz' }],
    }),
    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,
});
