import { appEnvConfig } from '@/config/app-env-config';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(dev-space)/dev-temp-space')({
    staticData: {
        crumb: {
            label: 'Developer Testing Space',
        },
    },

    head: () => ({
        meta: [{ title: 'Developer Testing Space | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Development testing space for ITOps Toolkit' }],
    }),

    beforeLoad: () => {
        if (!appEnvConfig.enableDevSpacePage) {
            throw new UnAuthorisedAccessError('', '');
        }
    },

    component: lazyRouteComponent(async () => {
        return import('@/modules/dev-temp-space/pages/DevTestSpacePage');
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
