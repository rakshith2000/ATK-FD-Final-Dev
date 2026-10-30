import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/service-request')({
    component: lazyRouteComponent(async () => {
        const ServiceRequestPage = await import('@/modules/service-request/pages/ServiceRequestPage');
        return ServiceRequestPage;
    }),

    staticData: {
        crumb: {
            label: 'Service Request AI',
        },
    },

    head: () => ({
        meta: [{ title: 'Service Request | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered service request fulfillment and resolution' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.service_request_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
