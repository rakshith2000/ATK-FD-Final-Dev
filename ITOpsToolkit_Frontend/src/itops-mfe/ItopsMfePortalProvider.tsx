import { createContext, useContext, type ReactNode } from 'react';

/**
 * Provides the ITOps MFE render container to the rest of the app.
 * Used to redirect React portals (MUI dialogs, popovers, custom modals)
 * into the shadow root so they stay inside the style isolation boundary.
 */
const ItopsMfePortalContext = createContext<HTMLElement | null>(null);

export const useItopsMfePortalContainer = (): HTMLElement | undefined => {
    const container = useContext(ItopsMfePortalContext);
    return container ?? undefined;
};

export const ItopsMfePortalProvider = ({ container, children }: { container: HTMLElement; children: ReactNode }) => {
    return <ItopsMfePortalContext.Provider value={container}>{children}</ItopsMfePortalContext.Provider>;
};
