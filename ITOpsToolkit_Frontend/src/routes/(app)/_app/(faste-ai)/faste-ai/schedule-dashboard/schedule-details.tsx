import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/schedule-dashboard/schedule-details')({
    component: lazyRouteComponent(async () => {
        const ScheduleDetailsPage = await import('../../../../../../modules/faste-ai/schedule-dashboard/pages/ScheduleDetailsPage');
        return ScheduleDetailsPage;
    }),

    staticData: {
        crumb: {
            label: 'Schedule Details',
        },
    },

    head: () => ({
        meta: [
            { title: 'Schedule Details | FASTE AI Toolkit' },
            { name: 'description', content: 'In-depth orchestration reporting and configuration management telemetry matrices.' },
        ],
    }),

    pendingMs: 400,
    pendingComponent: ComponentLoadingIndicator,
});
