import { useCallback, useEffect, useRef, useState } from 'react';

type ScrollDirection = 'horizontal' | 'vertical' | 'both';

interface ScrollOverflowState {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    canScrollUp: boolean;
    canScrollDown: boolean;
}

interface UseScrollOverflowOptions {
    direction?: ScrollDirection;
    scrollDistance?: number;
    wheelSpeed?: number;
}

interface UseScrollOverflowReturn<T extends HTMLElement> {
    scrollContainerRef: React.RefObject<T | null>;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    canScrollUp: boolean;
    canScrollDown: boolean;
    scrollLeft: (distance?: number) => void;
    scrollRight: (distance?: number) => void;
    scrollUp: (distance?: number) => void;
    scrollDown: (distance?: number) => void;
}

export function useScrollOverflow<T extends HTMLElement = HTMLDivElement>(options: UseScrollOverflowOptions = {}): UseScrollOverflowReturn<T> {
    const { direction = 'horizontal', scrollDistance = 300, wheelSpeed = 10 } = options;

    const scrollContainerRef = useRef<T | null>(null);

    const [scrollState, setScrollState] = useState<ScrollOverflowState>({
        canScrollLeft: false,
        canScrollRight: false,
        canScrollUp: false,
        canScrollDown: false,
    });

    const updateScrollState = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        // 1px buffer handles subpixel rounding across browsers
        const BUFFER = 1;

        setScrollState({
            canScrollLeft: direction !== 'vertical' ? el.scrollLeft > 0 : false,
            canScrollRight: direction !== 'vertical' ? el.scrollLeft + el.clientWidth < el.scrollWidth - BUFFER : false,
            canScrollUp: direction !== 'horizontal' ? el.scrollTop > 0 : false,
            canScrollDown: direction !== 'horizontal' ? el.scrollTop + el.clientHeight < el.scrollHeight - BUFFER : false,
        });
    }, [direction]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        updateScrollState();

        el.addEventListener('scroll', updateScrollState, { passive: true });

        const resizeObserver = new ResizeObserver(updateScrollState);
        resizeObserver.observe(el);

        // Redirect vertical wheel events to horizontal scroll
        const handleWheel = (e: WheelEvent) => {
            if (direction === 'vertical' || e.deltaY === 0) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY * wheelSpeed;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            el.removeEventListener('scroll', updateScrollState);
            el.removeEventListener('wheel', handleWheel);
            resizeObserver.disconnect();
        };
    }, [updateScrollState, direction, wheelSpeed]);

    const scrollLeft = useCallback(
        (distance = scrollDistance) => {
            scrollContainerRef.current?.scrollBy({ left: -distance, behavior: 'smooth' });
        },
        [scrollDistance],
    );

    const scrollRight = useCallback(
        (distance = scrollDistance) => {
            scrollContainerRef.current?.scrollBy({ left: distance, behavior: 'smooth' });
        },
        [scrollDistance],
    );

    const scrollUp = useCallback(
        (distance = scrollDistance) => {
            scrollContainerRef.current?.scrollBy({ top: -distance, behavior: 'smooth' });
        },
        [scrollDistance],
    );

    const scrollDown = useCallback(
        (distance = scrollDistance) => {
            scrollContainerRef.current?.scrollBy({ top: distance, behavior: 'smooth' });
        },
        [scrollDistance],
    );

    return {
        scrollContainerRef,
        canScrollLeft: scrollState.canScrollLeft,
        canScrollRight: scrollState.canScrollRight,
        canScrollUp: scrollState.canScrollUp,
        canScrollDown: scrollState.canScrollDown,
        scrollLeft,
        scrollRight,
        scrollUp,
        scrollDown,
    };
}
