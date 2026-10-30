import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/incident-ai')({
    component: lazyRouteComponent(async () => {
        const IncidentAIPage = await import('@/modules/incident-ai/pages/IncidentAIPage');
        return IncidentAIPage;
    }),

    staticData: {
        crumb: {
            label: 'Incident AI',
        },
    },

    head: () => ({
        meta: [{ title: 'Incident AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered incident management and resolution' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.incident_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
