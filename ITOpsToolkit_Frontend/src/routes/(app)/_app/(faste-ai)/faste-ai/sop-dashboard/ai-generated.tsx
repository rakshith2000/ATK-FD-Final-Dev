import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/sop-dashboard/ai-generated')({
    component: lazyRouteComponent(async () => {
        const AiGeneratedSopsPage = await import('@/modules/faste-ai/sop-dashboard/pages/AiGeneratedSopsPage');
        return AiGeneratedSopsPage;
    }),

    staticData: {
        crumb: {
            label: 'AI Generated SOPs',
        },
    },

    head: () => ({
        meta: [
            { title: 'AI Generated SOPs | FASTE AI Toolkit' },
            { name: 'description', content: 'Review and enhance standard operating procedures generated automatically by AI.' },
        ],
    }),

    pendingMs: 400,
    pendingComponent: ComponentLoadingIndicator,
});
