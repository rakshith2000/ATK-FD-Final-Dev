import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';
import { ScheduleDashboardPage } from '../../../../../modules/faste-ai/schedule-dashboard/pages/ScheduleDashboardPage';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/schedule-dashboard')({
    component: RouteComponent,
});

function RouteComponent() {
    const matches = useMatches();

    const isSubRouteActive = matches.some((match) => match.routeId.includes('/schedule-dashboard/'));

    if (isSubRouteActive) {
        return <Outlet />;
    }

    return <ScheduleDashboardPage />;
}
