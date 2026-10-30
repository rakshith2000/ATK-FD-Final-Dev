import { createContext, useContext, useState, type ReactNode } from 'react';

export type ViewMode = 'compact' | 'normal' | 'large';

export const viewModeOptions: { label: string; value: ViewMode }[] = [
    { label: 'Compact', value: 'compact' },
    { label: 'Normal', value: 'normal' },
    { label: 'Large', value: 'large' },
];

const STORAGE_KEY = 'app-view-mode';

const VIEW_MODE_ZOOM: Record<ViewMode, number> = {
    compact: 0.9,
    normal: 1,
    large: 1.1,
};

interface ViewModeContextValue {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    zoom: number;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function getDefaultMode(): ViewMode {
    return window.innerWidth <= 720 ? 'compact' : 'normal';
}

function getStoredMode(): ViewMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'compact' || stored === 'normal' || stored === 'large') return stored;
    } catch {}
    return getDefaultMode();
}

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
    const [viewMode, setViewModeState] = useState<ViewMode>(getStoredMode);

    const setViewMode = (mode: ViewMode) => {
        setViewModeState(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {}
    };

    return <ViewModeContext.Provider value={{ viewMode, setViewMode, zoom: VIEW_MODE_ZOOM[viewMode] }}>{children}</ViewModeContext.Provider>;
};

export const useViewMode = (): ViewModeContextValue => {
    const ctx = useContext(ViewModeContext);
    if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
    return ctx;
};
