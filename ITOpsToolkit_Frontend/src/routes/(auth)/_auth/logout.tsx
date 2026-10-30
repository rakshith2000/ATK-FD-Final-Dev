import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/_auth/logout')({
    head: () => ({
        meta: [{ title: 'Logout | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Sign out of ITOps Toolkit' }],
    }),
    component: RouteComponent,
});

function RouteComponent() {
    return <div>Hello "/_auth/logout"!</div>;
}
