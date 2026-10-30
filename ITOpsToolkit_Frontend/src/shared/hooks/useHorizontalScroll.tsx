import { useEffect } from 'react';

/**
 * @deprecated use useScrollOverflow
 * @param ref
 * @param speed
 */
const useHorizontalScroll = <T extends HTMLElement>(ref: React.RefObject<T | null>, speed = 10) => {
    useEffect(() => {
        if (!ref) return;

        const el = ref.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY === 0) return;

            e.preventDefault();
            el.scrollLeft += e.deltaY * speed;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            el.removeEventListener('wheel', handleWheel);
        };
    }, [ref, speed]);
};

export default useHorizontalScroll;
