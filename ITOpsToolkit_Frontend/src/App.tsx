import logger from './shared/utils/logger';
import type React from 'react';
import TanstackQueryClientProvider from '@/providers/TanstackQueryClientProvider';
import TanstackRouterProvider from '@/providers/TanstackRouterProvider';
import { AuthProvider } from '@/shared/modules/auth/context/AuthContext';
import GlobalAlertDialog from './shared/components/smart/GlobalAlertDialog/GlobalAlertDialog';
import GlobalAlertToast from './shared/components/smart/GlobalAlertToast/GlobalAlertToast';
import GlobalSuccessAlert from './shared/components/smart/GlobalSuccessAlert/GlobalSuccessAlert';
import MuiThemeProvider from './providers/MuiThemeProvider';
import { ViewModeProvider } from './shared/context/ViewModeContext';

const App: React.FC = () => {
    logger.debug('App component rendered');
    return (
        <div className="min-h-screen">
            <ViewModeProvider>
                <MuiThemeProvider>
                    <AuthProvider>
                        <TanstackQueryClientProvider>
                            <TanstackRouterProvider />
                            <GlobalAlertDialog />
                            <GlobalAlertToast />
                            <GlobalSuccessAlert />
                        </TanstackQueryClientProvider>
                    </AuthProvider>
                </MuiThemeProvider>
            </ViewModeProvider>
        </div>
    );
};

export default App;
