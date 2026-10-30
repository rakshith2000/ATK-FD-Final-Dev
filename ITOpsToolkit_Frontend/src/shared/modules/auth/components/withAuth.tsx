import React, { useEffect, useEffectEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../types/auth';
import logger from '@/shared/utils/logger';
import { ErrorCauseRenderer } from '@/shared/components/ui/ErrorCauseRenderer/ErrorCauseRenderer';

export type WithAuthProps = {
    user: AuthUser;
};

const withAuth = <T extends object>(WrappedComponent: React.ComponentType<T & WithAuthProps>) => {
    const AuthGuard = (props: T) => {
        const { state, login, logout } = useAuth();

        const doLogin = useEffectEvent(() => {
            if (state.isInitialized && !state.isAuthenticated && !state.isLoading && !state.error && !state.sessionExpired) {
                logger.debug('withAuth: no active session - triggering login');
                login();
            }
        });

        useEffect(() => {
            doLogin();
        }, []);

        //  dev-only shortcut to simulate session expiry
        useEffect(() => {
            const handler = (e: KeyboardEvent) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                    import('../utils/get-auth-provider-instance').then(({ getAuthProviderInstance }) => {
                        const provider = getAuthProviderInstance();
                        const current = provider.getState();
                        provider.subscribe(() => {}); // no-op, just to trigger
                        // Manually broadcast session expired state
                        (provider as unknown as { setState(s: typeof current): void }).setState({
                            ...current,
                            sessionExpired: !current.sessionExpired,
                            error: current.sessionExpired ? null : new Error('Your session has expired. Please re-authenticate or extend your session.'),
                        });
                    });
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }, []);

        const showLoading = !state.isInitialized || state.isLoading;
        const showSessionExpired = state.sessionExpired;
        const showError = !!state.error && !state.sessionExpired;

        return (
            <>
                {(state.isAuthenticated || state.sessionExpired) && state.user && <WrappedComponent {...props} user={state.user} />}

                {showLoading && (
                    <div className="fixed inset-0 z-50000 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                        <div className="bg-zinc-100 w-[80%] h-[70%] flex flex-col lg:flex-row items-start justify-center rounded-lg shadow-2xl shadow-olive-400">
                            <div className="w-full lg:w-[60%] h-full flex items-center justify-center text-center p-6">
                                <p className="text-(--brand-title-primary-color) font-bold text-3xl">Autonomous ITOps Toolkit</p>
                            </div>
                            <div className="w-full lg:w-[40%] h-full bg-[linear-gradient(-281deg,#c1bfcf_11%,rgb(255_248_255/40%)_100%)] text-center text-gray-700 rounded flex items-center justify-center p-6">
                                <p className="text-base font-normal">Initializing authentication...</p>
                            </div>
                        </div>
                    </div>
                )}

                {showSessionExpired && (
                    <div className="fixed inset-0 z-49999 flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
                        <div
                            className="w-full max-w-sm px-5 py-5 rounded-xl text-center"
                            style={{
                                background: 'color-mix(in srgb, var(--brand-color) 6%, white)',
                                border: '1px solid color-mix(in srgb, var(--brand-color) 15%, transparent)',
                                backdropFilter: 'blur(8px)',
                            }}
                        >
                            <div
                                className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
                                style={{ background: 'color-mix(in srgb, var(--brand-color) 12%, transparent)' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeWidth="1.8" style={{ stroke: 'var(--brand-color)' }}>
                                    <circle cx="9" cy="9" r="7.5" />
                                    <line x1="9" y1="5.5" x2="9" y2="9.5" />
                                    <circle cx="9" cy="12.5" r="0.6" style={{ fill: 'var(--brand-color)' }} />
                                </svg>
                            </div>
                            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--brand-color)' }}>
                                Session Expired
                            </h2>
                            <p className="text-xs leading-relaxed mb-4" style={{ color: 'color-mix(in srgb, var(--brand-color) 90%, transparent)' }}>
                                Your session has expired. Please re-authenticate or logout.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={login}
                                    className="w-full px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer"
                                    style={{ background: 'var(--brand-color)', color: 'var(--brand-text-inverse)', border: '1px solid var(--brand-color)' }}
                                >
                                    Re-Authenticate
                                </button>
                                <button
                                    onClick={logout}
                                    className="w-full px-4 py-2 text-xs font-medium rounded-lg bg-transparent text-red-700 border border-red-200 transition-all duration-200 cursor-pointer"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showError && (
                    <div className="fixed inset-0 z-49999 flex items-center justify-center bg-black/10 backdrop-blur-xs">
                        <div className="w-full max-w-sm px-5 py-4 rounded-xl bg-white/80 backdrop-blur-sm text-center">
                            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100/70 mb-3">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.8">
                                    <circle cx="8" cy="8" r="6.5" />
                                    <line x1="8" y1="5" x2="8" y2="8.5" />
                                    <circle cx="8" cy="11" r="0.6" fill="#dc2626" />
                                </svg>
                            </div>
                            <h2 className="text-sm font-semibold text-red-700 mb-1">Authentication Failed !</h2>
                            <p className="text-xs text-red-500/80 leading-relaxed mb-1">{state.error?.message}</p>
                            <ErrorCauseRenderer error={state.error} />
                            <div className="flex gap-3 justify-center items-center">
                                <button
                                    onClick={logout}
                                    className="mt-3 px-4 py-1.5 text-xs font-medium rounded-lg
                                   text-red-600 border border-red-200/70 bg-transparent
                                   hover:bg-red-600 hover:text-white hover:border-red-600
                                   transition-all duration-200 cursor-pointer"
                                >
                                    Logout !
                                </button>

                                <button
                                    onClick={login}
                                    className="mt-3 px-4 py-1.5 text-xs font-medium rounded-lg
                                   text-blue-600 border border-blue-200/70 bg-transparent
                                   hover:bg-blue-600 hover:text-white hover:border-blue-600
                                   transition-all duration-200 cursor-pointer"
                                >
                                    Re-Authenticate !
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    AuthGuard.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

    return AuthGuard;
};

export default withAuth;
