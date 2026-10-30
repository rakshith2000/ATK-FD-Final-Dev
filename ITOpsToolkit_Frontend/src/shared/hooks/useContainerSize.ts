import { useState, useCallback } from 'react';

/** Measures the container's actual pixel dimensions via a callback ref */
export function useContainerSize() {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const ref = useCallback((el: HTMLDivElement | null) => {
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        if (width > 0 && height > 0) setSize({ width, height });
    }, []);
    return { ref, ...size };
}
