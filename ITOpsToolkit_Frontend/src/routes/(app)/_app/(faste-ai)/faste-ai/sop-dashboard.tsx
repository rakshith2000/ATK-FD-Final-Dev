import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/sop-dashboard')({
    staticData: { crumb: { label: 'SOP Dashboard' } },
    head: () => ({
        meta: [{ title: 'SOP Dashboard | FASTE AI Toolkit' }, { name: 'description', content: 'Review, manage, and systematically generate Standard Operating Procedures.' }],
    }),
    component: () => <Outlet />,
});
