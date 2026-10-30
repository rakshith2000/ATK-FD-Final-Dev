import { appConfig } from '@/config/app-config';
import ComponentLoadingIndicator from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/agent-gateway')({
    component: lazyRouteComponent(async () => {
        const AgentGatewayEmbed = await import('@/modules/admin-portal/modules/agent-gateway/pages/AgentGatewayEmbed');
        return AgentGatewayEmbed;
    }),

    staticData: {
        crumb: { label: 'Agent Gateway' },
    },

    head: () => ({
        meta: [
            { title: 'Agent Gateway | Settings | Autonomous ITOps Toolkit' },
            { name: 'description', content: 'Agent Gateway to securely manage, route, and observe interactions between AI agents, end users, and underlying MCP tools.' },
        ],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminAgentGateWay)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
