import { HeadContent, Outlet, createRootRoute, useSearch } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { verifyLicense } from '@/license/utils/verify-license';
import { FaTools } from 'react-icons/fa';

export const Route = createRootRoute({
    beforeLoad: async () => {
        const license = await verifyLicense();
        if (!license.valid) {
            throw new Error('Application license is invalid or expired. Please contact application support team !.', {
                cause: {
                    licenseStatus: 'invalid',
                    details: 'The license token could not be verified. This may be due to an expired, tampered, or missing license.',
                },
            });
        }
    },
    head: () => ({
        meta: [{ title: 'Autonomous ITOps Toolkit' }, { name: 'description', content: 'Autonomous ITOps Toolkit - AI-powered IT Operations platform' }],
    }),
    staticData: {},
    component: () => {
        const searchParams = useSearch({ strict: false }) as Record<string, unknown>;
        const showTrigger = 'show-dev-tools' in searchParams || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('show-dev-tools'));

        if (typeof window !== 'undefined') {
            try {
                const settingsStr = localStorage.getItem('tanstack_devtools_settings');
                const settings = settingsStr ? JSON.parse(settingsStr) : {};
                let changed = false;
                if (!settings.openHotkey || settings.openHotkey.length !== 0) {
                    settings.openHotkey = [];
                    changed = true;
                }
                if (settings.triggerHidden !== !showTrigger) {
                    settings.triggerHidden = !showTrigger;
                    changed = true;
                }
                if (changed) {
                    localStorage.setItem('tanstack_devtools_settings', JSON.stringify(settings));
                }
            } catch {
                // Ignore storage issues
            }
        }

        const isDev = import.meta.env.DEV;
        const showDevtools = isDev;

        return (
            <>
                <HeadContent />
                <Outlet />
                {showDevtools && (
                    <TanStackDevtools
                        config={{
                            position: 'bottom-right',
                            triggerHidden: !showTrigger,
                            openHotkey: [],
                            customTrigger: showTrigger ? (
                                <button
                                    style={{
                                        position: 'fixed',
                                        bottom: '20px',
                                        right: '20px',
                                        zIndex: 99999,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(24, 24, 27, 0.85)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                        color: '#f4f4f5',
                                        border: '1px solid rgba(63, 63, 70, 0.4)',
                                        borderRadius: '9999px',
                                        padding: '8px 14px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.03em',
                                        textTransform: 'uppercase',
                                        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.15)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(39, 39, 42, 0.95)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 24px -2px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(24, 24, 27, 0.85)';
                                        e.currentTarget.style.borderColor = 'rgba(63, 63, 70, 0.4)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.15)';
                                    }}
                                >
                                    <FaTools size={11} style={{ color: '#818cf8', transition: 'transform 0.2s' }} />
                                    <span>DevTools</span>
                                </button>
                            ) : (
                                <button style={{ display: 'none' }} />
                            ),
                        }}
                        eventBusConfig={{ debug: false }}
                        plugins={[
                            {
                                name: 'Tanstack Router',
                                render: <TanStackRouterDevtoolsPanel />,
                            },
                            {
                                name: 'Tanstack Query',
                                render: <ReactQueryDevtoolsPanel />,
                            },
                            formDevtoolsPlugin(),
                        ]}
                    />
                )}
            </>
        );
    },
});
