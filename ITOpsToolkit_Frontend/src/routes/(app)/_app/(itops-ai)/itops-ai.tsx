import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'ITOPS' } },
    head: () => ({
        meta: [{ title: 'ITOps | Autonomous ITOps Toolkit' }, { name: 'description', content: 'IT Operations management and AI-powered tools' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.itops_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
