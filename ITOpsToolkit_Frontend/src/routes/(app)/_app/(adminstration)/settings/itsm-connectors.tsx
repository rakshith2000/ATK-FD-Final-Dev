import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/itsm-connectors')({
    component: lazyRouteComponent(async () => {
        const { default: ITSMConnectorsTable } = await import('@/modules/admin-portal/modules/itsm-connectors/components/smart/ITSMConnectorsTable/ITSMConnectorsTable');
        return { default: ITSMConnectorsTable };
    }),

    staticData: {
        crumb: { label: 'ITSM Connectors' },
    },

    head: () => ({
        meta: [{ title: 'ITSM Connectors | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Manage ITSM connectors' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminItsmConnectors)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
