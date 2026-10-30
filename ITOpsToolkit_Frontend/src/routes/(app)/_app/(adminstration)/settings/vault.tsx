import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/vault')({
    component: lazyRouteComponent(async () => {
        const { default: VaultConfig } = await import('@/modules/admin-portal/modules/vault/components/ui/VaultConfig/VaultConfig');
        return { default: VaultConfig };
    }),

    staticData: {
        crumb: { label: 'Vault' },
    },

    head: () => ({
        meta: [{ title: 'Vault | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Configure vault settings' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminVault)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
