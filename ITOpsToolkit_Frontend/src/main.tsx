import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import reportWebVitals from './reportWebVitals.ts';
import App from './App.tsx';
import './index.css';
import ErrorBoundaryFallback from './shared/components/ui/ErrorBoundaryFallback/ErrorBoundaryFallback.tsx';
import errorLoggingService from './shared/services/error-logging-service.ts';
import { loadAppConfig } from './config/app-config.ts';
import { loadAppLicense } from './license/load-app-license.ts';

window.addEventListener('unhandledrejection', (event) => {
    errorLoggingService.report('unhandledrejection', event.reason);
});

window.addEventListener('error', (event) => {
    errorLoggingService.report('global', event.error ?? event.message);
});

const rootElement = document.getElementById('app');

const bootstrapPromise = Promise.all([loadAppLicense(), loadAppConfig()]);

// Bootstrap the application - load runtime config before rendering
if (rootElement && !rootElement.innerHTML) {
    bootstrapPromise
        .then(() => {
            const root = ReactDOM.createRoot(rootElement, {
                onCaughtError: errorLoggingService.onCaughtError,
                onUncaughtError: errorLoggingService.onUncaughtError,
                onRecoverableError: errorLoggingService.onRecoverableError,
            });
            root.render(
                <StrictMode>
                    <ErrorBoundary
                        fallbackRender={({ error, resetErrorBoundary }) => {
                            return <ErrorBoundaryFallback error={error as Error} reset={resetErrorBoundary} title="Something went wrong" description={JSON.stringify(error)} />;
                        }}
                    >
                        <App />
                    </ErrorBoundary>
                </StrictMode>,
            );
        })
        .catch((error) => {
            rootElement.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:100dvh;padding:1rem;font-family:system-ui,sans-serif;">
                <div style="max-width:28rem;width:100%;display:flex;flex-direction:column;align-items:center;gap:0.75rem;border:1px solid #e5e7eb;border-radius:0.75rem;background:#fff;padding:1.5rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <div style="display:flex;align-items:center;justify-content:center;width:3rem;height:3rem;border-radius:50%;background:#fef2f2;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                    </div>
                    <h2 style="margin:0;font-size:0.875rem;font-weight:600;color:#111827;text-align:center;">Failed to bootstrap application</h2>
                    <p style="margin:0;font-size:0.75rem;color:#6b7280;text-align:center;line-height:1.5;">The application could not start.</p>
                    <div style="width:100%;border-radius:0.5rem;background:#fef2f2;border:1px solid #fee2e2;padding:0.5rem 0.75rem;">
                        <p style="margin:0;font-size:0.75rem;color:#dc2626;white-space:pre-wrap;word-break:break-word;line-height:1.5;">${error}</p>
                    </div>
                    <button onclick="location.reload()" style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.375rem 0.875rem;font-size:0.75rem;font-weight:500;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:0.5rem;cursor:pointer;transition:background 0.15s;">
                        Retry
                    </button>
                </div>
            </div>`;
        });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
