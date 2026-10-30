import { createFileRoute } from '@tanstack/react-router';
import { FasteDashboardPage } from '../../../../../../modules/faste-ai/faste-dashboard/pages/FasteDashboardPage';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/faste-dashboard/')({
    component: FasteDashboardPageIndexComponent,
});

function FasteDashboardPageIndexComponent() {
    return <FasteDashboardPage />;
}
