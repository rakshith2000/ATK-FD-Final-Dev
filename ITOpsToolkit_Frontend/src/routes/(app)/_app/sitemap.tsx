import { appEnvConfig } from '@/config/app-env-config';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/sitemap')({
    component: lazyRouteComponent(async () => {
        return import('@/modules/sitemap/pages/SiteMapPage');
    }),

    staticData: {
        crumb: {
            label: 'Site Map',
        },
    },

    head: () => ({
        meta: [{ title: 'Site Map | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Application route tree visualization' }],
    }),

    beforeLoad: () => {
        if (!appEnvConfig.enableSiteMapPage) {
            throw new UnAuthorisedAccessError('', '');
        }
    },

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
