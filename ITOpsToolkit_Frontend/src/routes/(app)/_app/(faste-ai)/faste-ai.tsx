import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai')({
    component: () => <Outlet />,
    staticData: { crumb: { label: 'FASTE AI' } },
    head: () => ({
        meta: [{ title: 'FasteAI | Autonomous Automation Toolkit' }, { name: 'description', content: 'Agentic task execution and intelligent performance dashboards.' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.faste_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
