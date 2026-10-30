import { useEffect, useMemo, useRef } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/shared/modules/auth/context/AuthContext';
import { ViewModeProvider } from '@/shared/context/ViewModeContext';
import { createItopsMfeRouter } from './itops-mfe-routes';
import { ItopsMfePortalProvider } from './ItopsMfePortalProvider';
import ItopsMfeMuiThemeProvider from './ItopsMfeMuiThemeProvider';
import GlobalAlertDialog from '@/shared/components/smart/GlobalAlertDialog/GlobalAlertDialog';
import GlobalAlertToast from '@/shared/components/smart/GlobalAlertToast/GlobalAlertToast';
import type { MFEMountOptions } from './types';

interface ItopsMfeAppProps {
    options: MFEMountOptions;
    container: HTMLElement;
}

const ItopsMfeApp: React.FC<ItopsMfeAppProps> = ({ options, container }) => {
    const { initialPath = '/', onNavigate } = options;

    const queryClient = useMemo(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { refetchOnWindowFocus: false, retry: false, staleTime: 1000 * 60 * 5 },
                    mutations: { retry: false },
                },
            }),
        [],
    );

    // Clean up query cache on unmount to prevent memory leaks across mount cycles
    useEffect(() => () => queryClient.clear(), [queryClient]);

    const router = useMemo(() => createItopsMfeRouter(initialPath), [initialPath]);

    const onNavigateRef = useRef(onNavigate);
    onNavigateRef.current = onNavigate;

    useEffect(() => {
        const unsubscribe = router.subscribe('onResolved', ({ toLocation }) => {
            onNavigateRef.current(toLocation.pathname);
        });
        return unsubscribe;
    }, [router]);

    return (
        <ItopsMfePortalProvider container={container}>
            <ViewModeProvider>
                <ItopsMfeMuiThemeProvider>
                    <AuthProvider>
                        <QueryClientProvider client={queryClient}>
                            <RouterProvider router={router} />
                            <GlobalAlertDialog />
                            <GlobalAlertToast />
                        </QueryClientProvider>
                    </AuthProvider>
                </ItopsMfeMuiThemeProvider>
            </ViewModeProvider>
        </ItopsMfePortalProvider>
    );
};

export default ItopsMfeApp;
