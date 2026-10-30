import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/(train-ai)/train-ai')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Train AI Dashboard' } },
    head: () => ({
        meta: [{ title: 'Train AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered Training tools' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.train_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
