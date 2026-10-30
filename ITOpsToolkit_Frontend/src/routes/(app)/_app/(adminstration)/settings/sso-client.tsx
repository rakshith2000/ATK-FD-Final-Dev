import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/sso-client')({
    component: lazyRouteComponent(async () => {
        const { default: SSOClientConfig } = await import('@/modules/admin-portal/modules/sso-client/components/ui/SSOClientConfig/SSOClientConfig');
        return { default: SSOClientConfig };
    }),

    staticData: {
        crumb: { label: 'SSO Client' },
    },

    head: () => ({
        meta: [{ title: 'SSO Client | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Configure SSO client settings' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminSsoClient)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
