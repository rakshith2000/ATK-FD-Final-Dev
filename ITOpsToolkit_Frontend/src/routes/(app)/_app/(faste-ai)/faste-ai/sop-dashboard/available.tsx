import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/sop-dashboard/available')({
    component: lazyRouteComponent(async () => {
        const AvailableSopsPage = await import('@/modules/faste-ai/sop-dashboard/pages/AvailableSopsPage');
        return AvailableSopsPage;
    }),

    staticData: {
        crumb: {
            label: 'Available SOPs',
        },
    },

    head: () => ({
        meta: [
            { title: 'Available SOPs | FASTE AI Toolkit' },
            { name: 'description', content: 'Review, enhance and save standard operating procedures that are already generated.' },
        ],
    }),

    pendingMs: 400,
    pendingComponent: ComponentLoadingIndicator,
});
