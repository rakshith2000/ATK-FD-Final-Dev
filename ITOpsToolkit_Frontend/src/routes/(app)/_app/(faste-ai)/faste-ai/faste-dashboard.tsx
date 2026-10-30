import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/faste-dashboard')({
    staticData: { crumb: { label: 'Faste Dashboard' } },
    head: () => ({
        meta: [
            { title: 'Faste Dashboard | FASTE AI Toolkit' },
            { name: 'description', content: 'Monitor real-time agentic task execution, system health, and intelligent operational performance analytics.' },
        ],
    }),
    component: () => <Outlet />,
});
