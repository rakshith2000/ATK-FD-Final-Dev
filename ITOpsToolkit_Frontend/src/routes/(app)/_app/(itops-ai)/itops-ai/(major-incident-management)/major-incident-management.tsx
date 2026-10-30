import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/(major-incident-management)/major-incident-management')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Major Incident Management AI' } },
    head: () => ({
        meta: [{ title: 'MIM | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered Major Incident Management tools' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.major_incident_management_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
