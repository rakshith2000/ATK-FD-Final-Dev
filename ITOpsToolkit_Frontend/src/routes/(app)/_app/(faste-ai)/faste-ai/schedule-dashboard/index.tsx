import { createFileRoute } from '@tanstack/react-router';
import { ScheduleDashboardPage } from '../../../../../../modules/faste-ai/schedule-dashboard/pages/ScheduleDashboardPage';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/schedule-dashboard/')({
    component: ScheduleDashboardPageIndexComponent,
});

function ScheduleDashboardPageIndexComponent() {
    return <ScheduleDashboardPage />;
}
