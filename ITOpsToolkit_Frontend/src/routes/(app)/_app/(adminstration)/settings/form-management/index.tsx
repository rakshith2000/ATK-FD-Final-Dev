import { appConfig } from '@/config/app-config';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/form-management/')({
    component: lazyRouteComponent(() => import('@/modules/admin-portal/modules/form-builder/pages/FormManagementIndexPage'), 'default'),

    staticData: {
        crumb: { label: 'Form Management' },
    },

    head: () => ({
        meta: [{ title: 'Form Management | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Form configuration management' }],
    }),

    pendingMinMs: 1000,

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminFormManagement)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
