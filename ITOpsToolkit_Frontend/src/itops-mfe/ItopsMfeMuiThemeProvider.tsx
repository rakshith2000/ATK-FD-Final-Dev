import { ThemeProvider, createTheme } from '@mui/material';
import { useMemo, useCallback } from 'react';
import { useViewMode } from '@/shared/context/ViewModeContext';
import { useItopsMfePortalContainer } from './ItopsMfePortalProvider';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { getShadowRoot } from './mountItopsMfeRoute';

/**
 * Creates an Emotion cache that injects styles into the shadow root.
 * This ensures MUI's CSS-in-JS styles live inside the shadow DOM boundary
 * and don't leak into or get overridden by the host app.
 */
function createShadowEmotionCache() {
    const shadowRoot = getShadowRoot();

    if (shadowRoot) {
        // Reuse existing container if present (prevents duplicates on remount)
        let emotionContainer = shadowRoot.getElementById('itops-mfe-emotion');
        if (!emotionContainer) {
            emotionContainer = document.createElement('div');
            emotionContainer.id = 'itops-mfe-emotion';
            shadowRoot.prepend(emotionContainer);
        }

        return createCache({
            key: 'mfe',
            container: emotionContainer,
        });
    }

    // Fallback for standalone mode (no shadow DOM)
    return createCache({ key: 'mfe' });
}

const ItopsMfeMuiThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { zoom } = useViewMode();
    const portalContainer = useItopsMfePortalContainer();

    const getContainer = useCallback(() => portalContainer ?? document.body, [portalContainer]);

    const emotionCache = useMemo(() => createShadowEmotionCache(), []);

    const theme = useMemo(
        () =>
            createTheme({
                typography: {
                    fontFamily: "'Cabin', sans-serif",
                },
                components: {
                    MuiDialog: {
                        defaultProps: {
                            container: getContainer,
                        },
                        styleOverrides: {
                            paper: { zoom },
                        },
                    },
                    MuiDrawer: {
                        defaultProps: {
                            container: getContainer,
                        },
                        styleOverrides: {
                            paper: { zoom },
                        },
                    },
                    MuiModal: {
                        defaultProps: {
                            container: getContainer,
                        },
                    },
                    MuiPopover: {
                        defaultProps: {
                            container: getContainer,
                        },
                        styleOverrides: {
                            paper: { scale: zoom },
                        },
                    },
                    MuiPopper: {
                        defaultProps: {
                            container: getContainer,
                        },
                    },
                    MuiMenu: {
                        defaultProps: {
                            container: getContainer,
                        },
                    },
                    MuiTooltip: {
                        defaultProps: {
                            slotProps: {
                                popper: {
                                    container: getContainer,
                                } as Record<string, unknown>,
                            },
                        },
                    },
                    MuiAutocomplete: {
                        defaultProps: {
                            slotProps: {
                                popper: {
                                    container: getContainer,
                                },
                            },
                        },
                        styleOverrides: {
                            paper: { scale: zoom },
                        },
                    },
                    MuiSelect: {
                        defaultProps: {
                            MenuProps: {
                                container: getContainer,
                            },
                        },
                    },
                    MuiListItemText: {
                        styleOverrides: {
                            primary: { fontSize: 12.5 },
                        },
                    },
                },
            }),
        [zoom, getContainer],
    );

    return (
        <CacheProvider value={emotionCache}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </CacheProvider>
    );
};

export default ItopsMfeMuiThemeProvider;
