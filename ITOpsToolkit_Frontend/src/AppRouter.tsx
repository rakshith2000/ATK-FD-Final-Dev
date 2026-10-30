import { createBrowserHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import ErrorBoundaryFallback from './shared/components/ui/ErrorBoundaryFallback/ErrorBoundaryFallback';
import logger from './shared/utils/logger';
import { ComponentLoadingIndicator } from './shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { NotFoundRoute } from './shared/components/ui/NotFoundRoute/NotFoundRoute';
import { appEnvConfig } from './config/app-env-config';
import UnAuthorisedAccessError from './shared/utils/errors/UnAuthorisedAccessError';

const AppRouter = createRouter({
    routeTree,
    basepath: appEnvConfig.applicationBasepath,
    notFoundMode: 'fuzzy',
    history: createBrowserHistory(),
    defaultNotFoundComponent: NotFoundRoute,
    scrollRestoration: true,
    defaultPreload: 'intent',
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

export default AppRouter;
