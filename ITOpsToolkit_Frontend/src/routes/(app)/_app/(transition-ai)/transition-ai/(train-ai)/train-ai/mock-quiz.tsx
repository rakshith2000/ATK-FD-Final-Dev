import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/(train-ai)/train-ai/mock-quiz')({
    component: lazyRouteComponent(async () => {
        const MockQuizPage = await import('@/modules/train-ai/pages/MockQuizPage');
        return MockQuizPage;
    }),
    staticData: {
        crumb: {
            label: 'Mock Quiz',
        },
    },
    head: () => ({
        meta: [{ title: 'Mock Quiz | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Practice scenarios with mock quizzes' }],
    }),
    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,
});
