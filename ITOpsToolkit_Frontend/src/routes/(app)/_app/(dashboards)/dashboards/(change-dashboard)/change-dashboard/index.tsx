import { createFileRoute } from '@tanstack/react-router';
import ChangeDashboardPage from '@/modules/change-management-dashboard/pages/ChangeDashboardPage';

export const Route = createFileRoute('/(app)/_app/(dashboards)/dashboards/(change-dashboard)/change-dashboard/')({
    head: () => ({
        meta: [{ title: 'Change Dashboard | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Change volume, risk and implementation windows' }],
    }),
    component: ChangeDashboardPage,
});
