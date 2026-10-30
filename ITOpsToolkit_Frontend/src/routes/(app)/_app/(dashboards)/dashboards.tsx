import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'Dashboards' } },
    head: () => ({
        meta: [
            { title: 'Dashboards | Autonomous ITOps Toolkit' },
            { name: 'description', content: 'Operational dashboards for incident, change, problem and service request management' },
        ],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.dashboards, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
