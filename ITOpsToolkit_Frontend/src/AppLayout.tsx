import { Outlet } from '@tanstack/react-router';
import withAuth from './shared/modules/auth/components/withAuth';
import AppHeader from './shared/components/ui/AppHeader/AppHeader';
import { useViewMode } from './shared/context/ViewModeContext';
import AppFooter from './shared/components/ui/AppFooter/AppFooter';

const AppLayout = () => {
    const { zoom } = useViewMode();

    return (
        <div id="app-layout" className="flex flex-col" style={{ zoom, height: `${100 / zoom}vh` }}>
            <AppHeader />
            <main className="flex-1 min-h-0 overflow-hidden py-0.5">
                <Outlet />
            </main>
            <AppFooter />
        </div>
    );
};

export default withAuth(AppLayout);
