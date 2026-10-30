import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/lite-llm-proxy')({
    component: lazyRouteComponent(async () => {
        const { default: LiteLLMProxyConfig } = await import('@/modules/admin-portal/modules/lite-llm-proxy/components/smart/LiteLLMProxyConfig/LiteLLMProxyConfig');
        return { default: LiteLLMProxyConfig };
    }),

    staticData: {
        crumb: { label: 'Lite LLM Proxy' },
    },

    head: () => ({
        meta: [{ title: 'Lite LLM Proxy | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Configure Lite LLM Proxy settings' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminLiteLLMProxy)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
