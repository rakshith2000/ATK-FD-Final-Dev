import { useViewMode } from '@/shared/context/ViewModeContext';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/_auth')({
    head: () => ({
        meta: [{ title: 'Authentication | Autonomous ITOps Toolkit' }, { name: 'description', content: 'ITOps Toolkit authentication' }],
    }),
    component: RouteComponent,
});

function RouteComponent() {
    const { zoom } = useViewMode();

    return (
        <div id="auth-layout" className="flex flex-col" style={{ zoom, height: `${100 / zoom}vh` }}>
            <main className="flex-1 min-h-0 overflow-hidden py-0.5">
                <Outlet />
            </main>
        </div>
    );
}
