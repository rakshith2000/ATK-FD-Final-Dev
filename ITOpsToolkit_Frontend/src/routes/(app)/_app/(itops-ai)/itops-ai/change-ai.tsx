import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/change-ai')({
    component: lazyRouteComponent(async () => {
        const ChangeAiPage = await import('@/modules/change-ai/pages/change-ai-landing/ChangeLandingPage');
        return ChangeAiPage;
    }),

    staticData: {
        crumb: {
            label: 'Change AI',
        },
    },

    head: () => ({
        meta: [{ title: 'Change AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered change management' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.change_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
