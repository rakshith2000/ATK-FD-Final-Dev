import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/llm-models')({
    component: lazyRouteComponent(async () => {
        const { default: LLMConfigurationsTable } = await import('@/modules/admin-portal/modules/llms/components/smart/LLMConfigurationsTable/LLMConfigurationsTable');
        return { default: LLMConfigurationsTable };
    }),

    staticData: {
        crumb: { label: 'LLM Models' },
    },

    head: () => ({
        meta: [{ title: 'LLM Models | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Configure LLM models' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminLlmModels)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
