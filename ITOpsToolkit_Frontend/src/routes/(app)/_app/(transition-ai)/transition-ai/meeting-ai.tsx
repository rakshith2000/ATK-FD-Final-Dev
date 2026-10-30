import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/meeting-ai')({
    component: lazyRouteComponent(async () => {
        const MeetingAssistLanding = await import('@/modules/meeting-ai/pages/MeetingAssistLanding/MeetingAssistLanding');
        return MeetingAssistLanding;
    }),

    staticData: {
        crumb: {
            label: 'Meeting AI',
        },
    },

    head: () => ({
        meta: [{ title: 'Meeting AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered meeting transcripts, summaries, and KB generation' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.meeting_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
