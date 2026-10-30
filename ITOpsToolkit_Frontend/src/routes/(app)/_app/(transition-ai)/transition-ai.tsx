import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Transition AI' } },
    head: () => ({
        meta: [{ title: 'Transition AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered transition management tools' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.transition_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
