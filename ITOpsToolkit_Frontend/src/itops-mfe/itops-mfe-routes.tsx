import { appConfig } from '@/config/app-config';
import { appEnvConfig } from '@/config/app-env-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import ErrorBoundaryFallback from '@/shared/components/ui/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { NotFoundRoute } from '@/shared/components/ui/NotFoundRoute/NotFoundRoute';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import logger from '@/shared/utils/logger';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet } from '@tanstack/react-router';

const itopsMfeRootRoute = createRootRoute({
    component: () => (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
                <Outlet />
            </div>
        </div>
    ),
});

const incidentAIRoute = createRoute({
    getParentRoute: () => itopsMfeRootRoute,
    path: '/itops/incident-ai',
    component: lazyRouteComponent(async () => {
        return import('@/modules/incident-ai/pages/IncidentAIPage');
    }),
    pendingComponent: ComponentLoadingIndicator,
});

const knowledgeAIRoute = createRoute({
    getParentRoute: () => itopsMfeRootRoute,
    path: '/transition-ai/knowledge-ai',
    component: lazyRouteComponent(async () => {
        return import('@/modules/knowledge-ai/pages/KnowledgeAIPage');
    }),
    pendingComponent: ComponentLoadingIndicator,
});

const adminPortalRoute = createRoute({
    getParentRoute: () => itopsMfeRootRoute,
    path: '/admin',
    component: lazyRouteComponent(async () => {
        return import('@/modules/admin-portal/pages/AdminPage');
    }),
    beforeLoad: async () => {
        const authUserMemberOfGroups = await getAuthProviderInstance().getUserMemberOfGroups();

        if (!authUserMemberOfGroups?.includes(appConfig.accessControl.pages.gbac.admin)) throw new UnAuthorisedAccessError('', '');
    },
    pendingComponent: ComponentLoadingIndicator,
});

const devTempTestRoute = createRoute({
    getParentRoute: () => itopsMfeRootRoute,
    path: '/dev-temp-space',
    component: lazyRouteComponent(async () => {
        return import('@/modules/dev-temp-space/pages/DevTestSpacePage');
    }),
    beforeLoad: () => {
        if (!appEnvConfig.enableDevSpacePage) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
    pendingComponent: ComponentLoadingIndicator,
});

const itopsMfeRouteTree = itopsMfeRootRoute.addChildren([incidentAIRoute, knowledgeAIRoute, adminPortalRoute, devTempTestRoute]);

export function createItopsMfeRouter(initialPath: string) {
    return createRouter({
        routeTree: itopsMfeRouteTree,
        history: createMemoryHistory({ initialEntries: [initialPath] }),
        defaultPreload: 'intent',
        defaultPendingMs: 500,
        notFoundMode: 'fuzzy',
        defaultNotFoundComponent: NotFoundRoute,
        defaultPendingComponent: ComponentLoadingIndicator,
        defaultErrorComponent: (props) => {
            const { error: tempError, reset, info } = props;

            const error: Error | undefined = tempError as Error | undefined;

            logger.error(error, reset, info);
            let errorTitle: string;
            let errorMessage: string;

            switch (true) {
                case error instanceof UnAuthorisedAccessError:
                    errorTitle = error.title;
                    errorMessage = error.message;
                    break;
                default:
                    errorTitle = error?.message || 'An unexpected error occurred.';
                    errorMessage = info?.componentStack || 'If the problem persists, please contact support or try again later.';
            }

            return <ErrorBoundaryFallback title={errorTitle} message={errorMessage} description={error?.stack || 'An unexpected error occurred.'} reset={reset} error={error} />;
        },
    });
}

export type ItopsMfeRouter = ReturnType<typeof createItopsMfeRouter>;
