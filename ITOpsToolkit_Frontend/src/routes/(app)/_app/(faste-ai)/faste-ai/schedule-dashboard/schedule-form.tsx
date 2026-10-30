import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/schedule-dashboard/schedule-form')({
    component: lazyRouteComponent(async () => {
        const ScheduleFormPage = await import('../../../../../../modules/faste-ai/schedule-dashboard/pages/ScheduleFormPage');
        return ScheduleFormPage;
    }),

    staticData: {
        crumb: {
            label: 'New Task Scheduler',
        },
    },

    head: () => ({
        meta: [{ title: 'Create Schedule | FASTE AI Toolkit' }, { name: 'description', content: 'Orchestrate new automated engine tasks.' }],
    }),

    pendingMs: 400,
    pendingComponent: ComponentLoadingIndicator,
});
