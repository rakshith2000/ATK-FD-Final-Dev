import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/_auth/login')({
    head: () => ({
        meta: [{ title: 'Login | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Sign in to ITOps Toolkit' }],
    }),
    component: RouteComponent,
});

function RouteComponent() {
    return <div>Hello "/_auth/login"!</div>;
}
