import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/sop-dashboard/approval')({
    component: lazyRouteComponent(async () => {
        const AwaitingApprovalSopsPage = await import('@/modules/faste-ai/sop-dashboard/pages/AwaitingApprovalSopsPage');
        return AwaitingApprovalSopsPage;
    }),

    staticData: {
        crumb: {
            label: 'SOPs Awaiting Approval',
        },
    },

    head: () => ({
        meta: [
            { title: 'SOPs Awaiting Approval | FASTE AI Toolkit' },
            { name: 'description', content: 'Pre-generated SOPs pending compliance approval and engineering verification.' },
        ],
    }),

    pendingMs: 400,
    pendingComponent: ComponentLoadingIndicator,
});
