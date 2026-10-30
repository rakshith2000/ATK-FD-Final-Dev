import { useEffect, useRef, useState } from 'react';

type BreakpointKey = 'xs' | 'sm' | 'isMobile' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
type BreakpointConfig = Record<BreakpointKey, number>;
type ScreenInfo = Record<BreakpointKey, boolean>;

interface useResponsiveScreenSizeReturn {
    screenSize: ScreenInfo;
    isMobile: boolean;
    gt: (bp: BreakpointKey) => boolean;
    gte: (bp: BreakpointKey) => boolean;
    lt: (bp: BreakpointKey) => boolean;
    lte: (bp: BreakpointKey) => boolean;
}

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement === 'function';

const DEFAULT_CONFIG: BreakpointConfig = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
    '4xl': 2560,
    isMobile: 768,
};

let config: BreakpointConfig = DEFAULT_CONFIG;
let cachedInfo: ScreenInfo = {
    isMobile: false,
    lg: false,
    md: false,
    sm: false,
    xl: false,
    '2xl': false,
    '4xl': false,
    xs: false,
};
let listening = false;
const subscribers = new Set<() => void>();

function calculate(): boolean {
    if (!isBrowser) return false;

    const width = window.innerWidth;
    let changed = false;
    const next: ScreenInfo = {
        isMobile: false,
        lg: false,
        md: false,
        sm: false,
        xl: false,
        '2xl': false,
        '4xl': false,
        xs: false,
    };

    for (const key of Object.keys(config)) {
        next[key as BreakpointKey] = width >= config[key as BreakpointKey];
        if (next[key as BreakpointKey] !== cachedInfo[key as BreakpointKey]) changed = true;
    }

    if (changed) cachedInfo = next;
    return changed;
}

function handleResize(): void {
    if (calculate()) {
        // Snapshot once, notify all subscribers with the same reference
        const snapshot = cachedInfo;
        for (const fn of subscribers) fn();
        void snapshot;
    }
}

function startListening(): void {
    if (listening) return;
    calculate();
    window.addEventListener('resize', handleResize, { passive: true });
    listening = true;
}

function stopListening(): void {
    window.removeEventListener('resize', handleResize);
    listening = false;
}

export function configResponsive(next: BreakpointConfig): void {
    config = next;
    calculate();
}

export default function useResponsiveScreenSize(): useResponsiveScreenSizeReturn {
    const [screenSize, setScreenSize] = useState<ScreenInfo>(() => {
        if (isBrowser && !listening) startListening();
        return cachedInfo;
    });

    const setterRef = useRef(setScreenSize);
    setterRef.current = setScreenSize;

    useEffect(() => {
        if (!isBrowser) return;

        // listening may have stopped between render and effect
        if (!listening) startListening();

        // Sync in case the window resized between render and effect mount
        if (calculate()) setterRef.current({ ...cachedInfo });

        const subscriber = () => setterRef.current({ ...cachedInfo });
        subscribers.add(subscriber);

        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0) stopListening();
        };
    }, []);

    const width = isBrowser ? window.innerWidth : 0;

    return {
        screenSize,
        isMobile: !screenSize?.lg,
        gt: (bp) => width > config[bp],
        gte: (bp) => width >= config[bp],
        lt: (bp) => width < config[bp],
        lte: (bp) => width <= config[bp],
    };
}
