import { useViewMode } from '@/shared/context/ViewModeContext';
import { CssBaseline, ThemeProvider } from '@mui/material';

import { createTheme } from '@mui/material';
import { useMemo } from 'react';

const MuiThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { zoom } = useViewMode();

    const theme = useMemo(
        () =>
            createTheme({
                typography: {
                    fontFamily: "'Cabin', sans-serif",
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            '.MuiInputBase-root.Mui-disabled': {
                                cursor: 'not-allowed !important',
                            },
                            '.MuiInputBase-input.Mui-disabled': {
                                cursor: 'not-allowed !important',
                            },
                            '.MuiSelect-select.Mui-disabled': {
                                cursor: 'not-allowed !important',
                            },
                            '.MuiAutocomplete-root .Mui-disabled': {
                                cursor: 'not-allowed !important',
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                zoom: zoom,
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                zoom: zoom,
                            },
                        },
                    },
                    MuiPopover: {
                        styleOverrides: {
                            paper: {
                                scale: zoom,
                            },
                        },
                    },
                    MuiAutocomplete: {
                        styleOverrides: {
                            paper: {
                                scale: zoom,
                            },
                        },
                    },
                    MuiListItemText: {
                        styleOverrides: {
                            primary: {
                                fontSize: 12.5,
                            },
                        },
                    },
                },
            }),
        [zoom],
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline /> {children}
        </ThemeProvider>
    );
};

export default MuiThemeProvider;
