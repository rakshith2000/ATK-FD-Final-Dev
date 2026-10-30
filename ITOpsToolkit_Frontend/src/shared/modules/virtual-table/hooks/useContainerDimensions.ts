import { useState, useEffect, type RefObject } from 'react';

interface ContainerDimensions {
    width: number;
    height: number;
}

export function useContainerDimensions(ref: RefObject<HTMLElement | null>): ContainerDimensions {
    const [dimensions, setDimensions] = useState<ContainerDimensions>({ width: 0, height: 0 });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setDimensions((prev) => {
                if (prev.width === Math.round(width) && prev.height === Math.round(height)) return prev;
                return { width: Math.round(width), height: Math.round(height) };
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return dimensions;
}
